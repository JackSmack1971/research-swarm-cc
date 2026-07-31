import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { learningRoot, readState, withLearningLock, writePolicy, writeState } from './lib/research-learning.mjs';
import { validateResearchRun } from './lib/research-validation.mjs';

const forbidden = /\b(?:ignore|disregard|weaken|bypass|disable)\b.{0,80}\b(?:security|constitution|validator|permission|provenance|evidence|verification|repair)\b/i;
const usage = 'Usage: node scripts/register-research-feedback.mjs <run-directory|run_id> <feedback-json> [critic-json]';
const stable = (value) => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value);
const schema = JSON.parse(await readFile(new URL('../research/schemas/research-feedback.schema.json', import.meta.url), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addFormat('date-time', { type: 'string', validate: (value) => !Number.isNaN(Date.parse(value)) });
const validate = ajv.compile(schema);

async function runDirectory(target) {
  try { if ((await stat(target)).isDirectory()) return path.resolve(target); } catch {}
  const root = path.resolve(process.env.RESEARCH_RUN_ROOT || 'artifacts/research-runs');
  try {
    for (const entry of await readdir(root, { withFileTypes: true })) if (entry.isDirectory()) {
      const directory = path.join(root, entry.name);
      try { if (JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8')).run_id === target) return directory; } catch {}
    }
  } catch {}
  return null;
}

const target = process.argv[2];
let input; let critic;
try { input = JSON.parse(process.argv[3]); critic = process.argv[4] ? JSON.parse(process.argv[4]) : null; } catch { console.error(JSON.stringify({ registered: false, reason: 'invalid_json', usage })); process.exit(2); }
if (!target || !input || typeof input !== 'object' || Array.isArray(input)) { console.error(JSON.stringify({ registered: false, reason: 'usage', usage })); process.exit(2); }
const directory = await runDirectory(target);
if (!directory) { console.error(JSON.stringify({ registered: false, reason: 'unknown_run' })); process.exit(1); }
const result = await validateResearchRun(directory);
if (!result.valid) { console.error(JSON.stringify({ registered: false, reason: 'archive_invalid', errors: result.errors })); process.exit(1); }
const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'));
if (manifest.archive_schema_version !== '2.0.0') { console.error(JSON.stringify({ registered: false, reason: 'archive_version' })); process.exit(1); }
const claims = new Set((await readFile(path.join(directory, 'claims.jsonl'), 'utf8')).split(/\r?\n/).filter(Boolean).map(JSON.parse).map(({ claim_id }) => claim_id));
const units = new Set(JSON.parse(await readFile(path.join(directory, 'report-map.json'), 'utf8')).report_units.map(({ report_unit_id }) => report_unit_id));
const normalized = { kind: input.kind, text: String(input.text ?? '').trim(), private: input.private === true, scope: input.scope, affected_claim_ids: [...new Set(input.affected_claim_ids || [])].sort(), affected_report_unit_ids: [...new Set(input.affected_report_unit_ids || [])].sort(), affected_lesson_ids: [...new Set(input.affected_lesson_ids || [])].sort() };
const feedback_id = `fdb_${createHash('sha256').update(stable({ run_id: manifest.run_id, ...normalized })).digest('hex').slice(0, 16)}`;
const record = { feedback_id, run_id: manifest.run_id, recorded_at: new Date().toISOString(), ...normalized, evidence_authority: normalized.kind === 'correction' ? 'explicit_user_correction' : 'single_evaluator_opinion', disposition: forbidden.test(normalized.text) ? 'rejected_constitution' : 'recorded' };
if (!validate(record)) { console.error(JSON.stringify({ registered: false, reason: 'invalid_feedback', errors: validate.errors })); process.exit(1); }
if (record.affected_claim_ids.some((id) => !claims.has(id)) || record.affected_report_unit_ids.some((id) => !units.has(id))) { console.error(JSON.stringify({ registered: false, reason: 'unknown_target' })); process.exit(1); }
const root = learningRoot();
const output = await withLearningLock(root, async () => {
  const state = await readState(root);
  const existing = state.feedback.find((item) => item.feedback_id === feedback_id);
  if (existing) return { registered: true, duplicate: true, feedback_id, policy_bundle_id: (await writePolicy(root, state)).policy_bundle_id };
  state.feedback.push(record);
  const reviewed = critic && ['approve', 'qualify', 'reject', 'insufficient_evidence'].includes(critic.outcome) && typeof critic.lesson_id === 'string' ? { critic_event_id: `lcr_${feedback_id.slice(4)}`, feedback_id, lesson_id: critic.lesson_id, critic_id: String(critic.critic_id || 'research-lesson-critic'), outcome: critic.outcome, rationale: String(critic.rationale || 'Independent review recorded.').slice(0, 2000), occurred_at: new Date().toISOString() } : null;
  if (reviewed && !state.critic.some((item) => item.critic_event_id === reviewed.critic_event_id)) state.critic.push(reviewed);
  if (record.kind === 'correction' && record.disposition === 'recorded') {
    for (const lessonId of record.affected_lesson_ids) {
      const index = state.active.findIndex((lesson) => lesson.lesson_id === lessonId);
      if (index < 0) continue;
      const lesson = state.active[index];
      const requiresReview = ['high', 'critical'].includes(lesson.risk);
      if (requiresReview && reviewed?.outcome !== 'approve' && reviewed?.outcome !== 'qualify') continue;
      state.active.splice(index, 1); state.rejected.push({ ...lesson, status: 'rejected', counterexample_run_ids: [...new Set([...lesson.counterexample_run_ids, record.run_id])].sort() });
    }
  }
  await writeState(root, state); const policy = await writePolicy(root, state);
  return { registered: true, duplicate: false, feedback_id, disposition: record.disposition, critic_review: reviewed?.outcome || 'unavailable', policy_bundle_id: policy.policy_bundle_id };
});
console.log(JSON.stringify(output));
