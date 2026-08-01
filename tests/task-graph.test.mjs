import assert from 'node:assert/strict';
import { execFile as execute } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';
import { compileContextCapsules, compileTaskGraph, detectTaskGraphDrift, renderContextCapsule, validateContextCapsule, validateTaskGraph } from '../scripts/lib/task-graph.mjs';
import { profileProject } from '../scripts/lib/project-profiler.mjs';

const execFile = promisify(execute);
const fixture = async () => JSON.parse(await readFile('tests/fixtures/change-contract/valid-accepted.json', 'utf8'));
const drafts = () => [{ task_id: 'tsk_fixture', title: 'Vertical fixture slice', objective: 'Make the fixture output observable end to end.', slice: 'vertical', criterion_ids: ['ac_fixture'], depends_on: [], code_anchors: [{ path: 'src/app.tsx', reason: 'The fixture behavior is defined here.' }], verification: { commands: ['npm test'], proofs: ['The output is byte-identical.'] } }];
async function setup(t) { const root = await mkdtemp(path.join(os.tmpdir(), 'task-graph-')); t.after(() => rm(root, { recursive: true, force: true })); await cp('tests/fixtures/project-profiler/node-web', root, { recursive: true }); await execFile('git', ['init', '-q'], { cwd: root }); await execFile('git', ['add', '.'], { cwd: root }); await execFile('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.test', 'commit', '-qm', 'fixture'], { cwd: root }); const contract = await fixture(); const profile = await profileProject(root); contract.base_repository = { identity: 'temporary fixture', ...profile.target }; return { root, contract }; }

test('compiles an accepted, current contract into a vertical task graph and minimal capsule', async (t) => {
  const { root, contract } = await setup(t); const graph = await compileTaskGraph({ graph_id: 'tgr_fixture', contract, targetPath: root, tasks: drafts() }); const [capsule] = await compileContextCapsules(graph, contract, root);
  assert.equal(validateTaskGraph(graph, contract).valid, true); assert.equal(validateContextCapsule(capsule).valid, true); assert.deepEqual(capsule.acceptance_criteria.map(({ criterion_id }) => criterion_id), ['ac_fixture']); assert.equal(renderContextCapsule(capsule), '# Task capsule: tsk_fixture\n\n## Objective\n\nMake the fixture output observable end to end.\n\n## Acceptance criteria\n\n- ac_fixture: Rendering the same canonical JSON twice produces byte-identical Markdown.\n\n## Code anchors\n\n- src/app.tsx: The fixture behavior is defined here.\n\n## Verification\n\n- npm test\n\n## Stop conditions\n\n- Stop if the base revision, contract hash, or anchor changes.\n- Escalate if work exceeds this task or conflicts with a dependency.\n- Do not execute production changes without later authorization.\n'); assert.equal((await detectTaskGraphDrift(graph, contract, root)).drifted, false);
});

test('fails closed for draft contracts, uncovered lineage, unordered collisions, and migration reversal', async (t) => {
  const { root, contract } = await setup(t); const draft = structuredClone(contract); draft.lifecycle_state = 'draft'; await assert.rejects(() => compileTaskGraph({ graph_id: 'tgr_fixture', contract: draft, targetPath: root, tasks: drafts() }), /accepted/);
  const uncovered = structuredClone(contract); uncovered.acceptance_criteria.push({ criterion_id: 'ac_extra', requirement_ids: ['req_fixture'], observable_proof: 'A second proof exists.' }); await assert.rejects(() => compileTaskGraph({ graph_id: 'tgr_fixture', contract: uncovered, targetPath: root, tasks: drafts() }), /not covered/);
  const collision = [...drafts(), { ...drafts()[0], task_id: 'tsk_other', code_anchors: [{ path: 'src', reason: 'Overlaps the existing anchor.' }] }]; await assert.rejects(() => compileTaskGraph({ graph_id: 'tgr_fixture', contract, targetPath: root, tasks: collision }), /collision/);
  const migration = [{ ...drafts()[0], task_id: 'tsk_expand', slice: 'expand' }, { ...drafts()[0], task_id: 'tsk_contract', slice: 'contract', depends_on: [] }, { ...drafts()[0], task_id: 'tsk_migrate', slice: 'migrate', depends_on: ['tsk_contract'] }]; await assert.rejects(() => compileTaskGraph({ graph_id: 'tgr_fixture', contract, targetPath: root, tasks: migration }), /Migration ordering/);
});

test('excludes unrelated decision context and invalidates capsules after source drift', async (t) => {
  const { root, contract } = await setup(t); contract.evidence_references.push('epk_irrelevant'); contract.decisions.push({ ...contract.decisions[0], decision_id: 'dec_irrelevant', evidence_references: ['epk_irrelevant'] }); contract.requirements.push({ requirement_id: 'req_irrelevant', statement: 'An unrelated requirement.', decision_ids: ['dec_irrelevant'] }); contract.acceptance_criteria.push({ criterion_id: 'ac_irrelevant', requirement_ids: ['req_irrelevant'], observable_proof: 'An unrelated proof.' }); const tasks = [...drafts(), { ...drafts()[0], task_id: 'tsk_irrelevant', criterion_ids: ['ac_irrelevant'], code_anchors: [{ path: 'package.json', reason: 'Separate fixture metadata.' }] }]; const graph = await compileTaskGraph({ graph_id: 'tgr_fixture', contract, targetPath: root, tasks }); const [capsule] = await compileContextCapsules(graph, contract, root);
  assert.deepEqual(capsule.decisions.map(({ decision_id }) => decision_id), ['dec_fixture']); assert.deepEqual(capsule.evidence_references, ['epk_fixture']); await writeFile(path.join(root, 'src', 'app.tsx'), 'changed\n'); assert.equal((await detectTaskGraphDrift(graph, contract, root)).drifted, true); await assert.rejects(() => compileContextCapsules(graph, contract, root), /source drift/);
});
