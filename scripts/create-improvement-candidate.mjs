import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONSTITUTION_VERSION, learningRoot, readState, withLearningLock } from './lib/research-learning.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROTECTED = /^(?:research\/self-improvement\/constitution\.md|\.claude\/settings\.json|research\/schemas\/|scripts\/(?:validate-research-run|generate-research-contracts)|artifacts\/research-learning\/)/;
const UNSAFE = /(?:\.{2}[\\/]|^[\\/]|^[A-Za-z]:|\x00)/;
const SECRET = /(?:-----BEGIN [A-Z ]+PRIVATE KEY-----|\b(?:api[_-]?key|secret|token)\s*[:=]\s*['\"]?[A-Za-z0-9_\-]{16,}|\bBearer\s+[A-Za-z0-9._-]{16,})/i;
const LIVE_CONTENT = /artifacts\/research-runs\/|(?:^|\/)sources\.jsonl|(?:^|\/)report\.md|(?:^|\/)claims\.jsonl/i;
const WEAKENING = /(?:disable|bypass|remove|weaken|lower|relax).{0,80}(?:validator|validation|provenance|evidence|permission|security|repair|ceiling|threshold)/i;
const TOOL_BROADENING = /^\+.*(?:tools:\s*.*\b(?:Write|Edit|Bash)\b|permission(?:s)?\s*:)/mi;
const TARGET_KINDS = new Set(['research_rules', 'research_standards_skill', 'role_agent_instruction', 'user_facing_command', 'generated_policy_default', 'workflow_prompt_or_bounded_control']);
const stable = (value) => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value);
const hash = (value) => createHash('sha256').update(value).digest('hex');
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const safePath = (file) => typeof file === 'string' && file.length > 0 && !UNSAFE.test(file) && !path.isAbsolute(file) && !PROTECTED.test(file.replaceAll('\\', '/'));

function fail(message) { throw new Error(`Improvement candidate rejected: ${message}`); }
function validatePatch(input) {
  if (typeof input.proposed_patch !== 'string' || !input.proposed_patch.includes('diff --git ')) fail('an exact unified proposed_patch is required.');
  if (SECRET.test(input.proposed_patch) || LIVE_CONTENT.test(input.proposed_patch) || WEAKENING.test(input.proposed_patch) || TOOL_BROADENING.test(input.proposed_patch)) fail('patch contains protected, live, secret, weakening, or permission-broadening content.');
  const patchFiles = [...input.proposed_patch.matchAll(/^\+\+\+ b\/(.+)$/gm)].map((match) => match[1]);
  if (!patchFiles.length || patchFiles.some((file) => !input.target_files.includes(file))) fail('patch files must be declared target_files.');
}
function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('proposal input must be an object.');
  for (const field of ['target_kind', 'expected_benefit', 'rollback_plan']) if (typeof input[field] !== 'string' || !input[field].trim()) fail(`${field} is required.`);
  if (!TARGET_KINDS.has(input.target_kind)) fail('target_kind is not an allowed candidate surface.');
  if (!Array.isArray(input.target_files) || !input.target_files.length || input.target_files.some((file) => !safePath(file))) fail('target_files must be safe, non-protected repository-relative paths.');
  if (!Array.isArray(input.active_lesson_ids) || new Set(input.active_lesson_ids).size < 2) fail('at least two active_lesson_ids are required.');
  if (!Array.isArray(input.known_risks) || !input.known_risks.length) fail('known_risks are required.');
  if (!Array.isArray(input.required_tests) || !input.required_tests.length) fail('required_tests are required.');
  if (!input.replay_canary_evidence || typeof input.replay_canary_evidence !== 'object') fail('replay_canary_evidence is required.');
  validatePatch(input);
}
async function targetRecords(files, repositoryRoot) {
  return Promise.all(files.map(async (file) => {
    const absolute = path.join(repositoryRoot, file);
    try { return { path: file, sha256: hash(await readFile(absolute)), exists: true }; } catch { return { path: file, sha256: null, exists: false }; }
  }));
}
function evidenceFor(state, ids) {
  const lessons = state.active.filter((lesson) => ids.includes(lesson.lesson_id));
  if (lessons.length !== ids.length || lessons.some((lesson) => lesson.confidence < 0.75 || !Array.isArray(lesson.supporting_run_ids) || !lesson.supporting_run_ids.length)) fail('all selected lessons must be strong active lessons with supporting runs.');
  const runs = [...new Set(lessons.flatMap((lesson) => lesson.supporting_run_ids))].sort();
  if (runs.length < 2) fail('selected lessons need evidence from at least two independent runs.');
  return { active_lesson_ids: [...ids].sort(), supporting_run_ids: runs, lessons: lessons.map(({ lesson_id, confidence, evidence_authority, supporting_run_ids, counterexample_run_ids = [] }) => ({ lesson_id, confidence, evidence_authority, supporting_run_ids: [...supporting_run_ids].sort(), counterexample_run_ids: [...counterexample_run_ids].sort() })), retained_counterevidence: lessons.flatMap(({ lesson_id, counterexample_run_ids = [] }) => counterexample_run_ids.map((run_id) => ({ lesson_id, run_id }))) };
}
async function overlaps(root, targetFiles) {
  const candidates = path.join(root, 'candidates');
  try {
    for (const name of await readdir(candidates)) {
      const manifest = await readJson(path.join(candidates, name, 'manifest.json')).catch(() => null);
      if (manifest && !['rejected'].includes(manifest.status) && manifest.target_files?.some((file) => targetFiles.includes(file))) return name;
    }
  } catch {}
  return null;
}

export async function createImprovementCandidate(input, { root = learningRoot(), repositoryRoot = ROOT } = {}) {
  validateInput(input);
  return withLearningLock(root, async () => {
    const state = await readState(root);
    const evidence = evidenceFor(state, input.active_lesson_ids);
    const overlap = await overlaps(root, input.target_files);
    if (overlap) fail(`target files overlap pending candidate ${overlap}.`);
    const candidateId = input.improvement_candidate_id || `imp_${hash(stable({ lessons: evidence.active_lesson_ids, files: [...input.target_files].sort(), patch: input.proposed_patch })).slice(0, 16)}`;
    if (!/^imp_[A-Za-z0-9][A-Za-z0-9_-]*$/.test(candidateId)) fail('improvement_candidate_id is invalid.');
    const directory = path.join(root, 'candidates', candidateId);
    const manifest = { improvement_candidate_id: candidateId, created_at: new Date().toISOString(), status: 'proposed', constitution_version: CONSTITUTION_VERSION, target_kind: input.target_kind, target_files: [...input.target_files].sort(), expected_benefit: input.expected_benefit.trim(), known_risks: input.known_risks, replay_canary_evidence: input.replay_canary_evidence, required_tests: input.required_tests, rollback_plan: input.rollback_plan.trim(), evidence_sha256: hash(stable(evidence)), proposed_patch_sha256: hash(input.proposed_patch) };
    await mkdir(directory, { recursive: true });
    await Promise.all([writeFile(path.join(directory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`), writeFile(path.join(directory, 'evidence-summary.json'), `${JSON.stringify(evidence, null, 2)}\n`), writeFile(path.join(directory, 'proposed.patch'), input.proposed_patch), writeFile(path.join(directory, 'target-files.json'), `${JSON.stringify(await targetRecords(manifest.target_files, repositoryRoot), null, 2)}\n`)]);
    return { created: true, candidate_directory: directory, improvement_candidate_id: candidateId, status: manifest.status };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: node scripts/create-improvement-candidate.mjs <proposal.json>');
  console.log(JSON.stringify(await createImprovementCandidate(await readJson(file))));
}
