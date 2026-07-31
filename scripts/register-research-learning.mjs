import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { validateResearchRun } from './lib/research-validation.mjs';
import { compilePolicy, learningRoot, mergeLesson, readState, safeLesson, withLearningLock, writePolicy, writeState } from './lib/research-learning.mjs';

const directory = process.argv[2];
if (!directory) { console.error(JSON.stringify({ valid: false, error: 'Usage: node scripts/register-research-learning.mjs <run-directory>' })); process.exit(2); }
const result = await validateResearchRun(directory);
if (!result.valid) { console.error(JSON.stringify({ registered: false, reason: 'archive_invalid', errors: result.errors })); process.exit(1); }
const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'));
if (manifest.archive_schema_version !== '2.0.0') { console.error(JSON.stringify({ registered: false, reason: 'archive_version' })); process.exit(1); }
const lessons = (await readFile(path.join(directory, 'lessons.jsonl'), 'utf8')).split(/\r?\n/).filter(Boolean).map(JSON.parse).filter(safeLesson);
const root = learningRoot();
const output = await withLearningLock(root, async () => { const state = await readState(root); if (state.manifest.paused) return { registered: false, paused: true }; if ((state.manifest.registered_run_ids || []).includes(manifest.run_id)) return { registered: true, duplicate: true, lessons: 0, policy_bundle_id: compilePolicy(state.active).policy_bundle_id }; const byKey = new Map(state.provisional.map((lesson) => [JSON.stringify([lesson.type, lesson.target?.policy_surface, lesson.target?.role, lesson.recommended_behavior?.trim().toLowerCase(), [...lesson.applicability_conditions].map((value) => value.trim().toLowerCase()).sort(), [...lesson.exclusions].map((value) => value.trim().toLowerCase()).sort()]), lesson])); for (const lesson of lessons) { const lessonKey = JSON.stringify([lesson.type, lesson.target?.policy_surface, lesson.target?.role, lesson.recommended_behavior?.trim().toLowerCase(), [...lesson.applicability_conditions].map((value) => value.trim().toLowerCase()).sort(), [...lesson.exclusions].map((value) => value.trim().toLowerCase()).sort()]); const existing = byKey.get(lessonKey); if (existing) Object.assign(existing, mergeLesson(existing, lesson)); else { state.provisional.push(lesson); byKey.set(lessonKey, lesson); } } state.manifest.registered_run_ids = [...new Set([...(state.manifest.registered_run_ids || []), manifest.run_id])]; state.manifest.last_registration = { run_id: manifest.run_id, registered_at: new Date().toISOString() }; await writeState(root, state); const policy = await writePolicy(root, state); return { registered: true, lessons: lessons.length, policy_bundle_id: policy.policy_bundle_id }; });
console.log(JSON.stringify(output));
