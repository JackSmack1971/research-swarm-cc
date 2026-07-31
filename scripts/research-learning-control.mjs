import { cp, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { FILES, learningRoot, readState, withLearningLock, writePolicy, writeState } from './lib/research-learning.mjs';

const [action, argument] = process.argv.slice(2);
const root = learningRoot();
const count = (items, status) => items.filter((item) => item.status === status).length;
const emit = (value) => console.log(JSON.stringify(value));
if (!['status', 'explain', 'pause', 'resume', 'rollback', 'rebuild'].includes(action)) { console.error('Usage: node scripts/research-learning-control.mjs <status|explain|pause|resume|rollback|rebuild> [argument]'); process.exit(2); }

const result = await withLearningLock(root, async () => {
  const state = await readState(root);
  if (action === 'status') return { health: state.manifest.constitution_version === '1.0.0' ? 'healthy' : 'empty_or_recoverable', paused: state.manifest.paused === true, active_lessons: state.active.map(({ lesson_id }) => lesson_id).sort(), candidates: state.candidates.map(({ candidate_id, status }) => ({ candidate_id, status })).sort((a, b) => a.candidate_id.localeCompare(b.candidate_id)), last_registration: state.manifest.last_registration || null, canaries: state.candidates.filter(({ status }) => status === 'canary').map(({ candidate_id }) => candidate_id).sort(), rollback: { available_snapshots: await snapshots(root), last_event: [...state.events].reverse().find((event) => event.type === 'rollback_restore') || null } };
  if (action === 'explain') { const lesson = state.active.find(({ lesson_id }) => lesson_id === argument); if (!lesson) throw new Error('Active lesson not found.'); return { lesson_id: lesson.lesson_id, status: lesson.status, target: lesson.target, activated_at: lesson.activated_at || null, evidence_authority: lesson.evidence_authority, confidence: lesson.confidence, supporting_run_ids: [...new Set(lesson.supporting_run_ids || [])].sort(), promotion_event_id: lesson.promotion_event_id || null, reason: state.events.find((event) => event.lesson_id === lesson.lesson_id && event.to_status === 'active')?.reason || 'Active under the recorded lifecycle decision.' }; }
  if (action === 'pause') { state.manifest.paused = true; state.events.push({ type: 'pause', occurred_at: new Date().toISOString() }); await writeState(root, state); await writePolicy(root, state); return { paused: true }; }
  if (action === 'resume') { if (state.manifest.constitution_version !== '1.0.0') throw new Error('Learning state is invalid; rebuild or recover it before resuming.'); state.manifest.paused = false; state.events.push({ type: 'resume', occurred_at: new Date().toISOString() }); await writeState(root, state); const policy = await writePolicy(root, state); return { paused: false, policy_bundle_id: policy.policy_bundle_id }; }
  if (action === 'rebuild') { const policy = await writePolicy(root, state); return { rebuilt: true, policy_bundle_id: policy.policy_bundle_id, active_lessons: count(state.active, 'active') }; }
  const snapshotId = path.basename(argument || ''); const source = path.join(root, 'snapshots', snapshotId); if (!snapshotId || source !== path.join(root, 'snapshots', snapshotId) || !(await stat(source)).isDirectory()) throw new Error('Snapshot not found.'); for (const name of FILES) await cp(path.join(source, name), path.join(root, name), { force: true }); const restored = await readState(root); restored.events.push({ type: 'rollback_restore', snapshot_id: snapshotId, occurred_at: new Date().toISOString() }); await writeState(root, restored); const policy = await writePolicy(root, restored); return { restored: snapshotId, policy_bundle_id: policy.policy_bundle_id };
});
emit(result);

async function snapshots(directory) { try { return (await readdir(path.join(directory, 'snapshots'), { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort(); } catch { return []; } }
