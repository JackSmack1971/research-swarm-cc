import assert from 'node:assert/strict';
import { execFile as execute } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';
import { scaffoldGreenfield, validateGreenfieldPlan } from '../scripts/lib/greenfield-builder.mjs';
import { authorizeTaskExecution } from '../scripts/lib/execution-authorization.mjs';
import { compileContextCapsules, compileTaskGraph } from '../scripts/lib/task-graph.mjs';
import { executeAuthorizedTask } from '../scripts/lib/task-executor.mjs';

const execFile = promisify(execute);
const fixture = async () => JSON.parse(await readFile('tests/fixtures/greenfield/plan.json', 'utf8'));
const command = async (root, argv) => process.platform === 'win32' && argv[0] === 'npm'
  ? execFile('cmd.exe', ['/d', '/s', '/c', ['npm.cmd', ...argv.slice(1)].join(' ')], { cwd: root, windowsHide: true })
  : execFile(argv[0], argv.slice(1), { cwd: root, windowsHide: true });

async function planFor(root) {
  const plan = await fixture();
  const profile = (await import('../scripts/lib/project-profiler.mjs')).profileProject;
  plan.contract.base_repository = { identity: 'greenfield-fixture', ...(await profile(root)).target };
  return plan;
}

test('scaffolds a native Node project from a charter and transitions the profiler', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'greenfield-')); t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, '.gitkeep'), ''); await command(root, ['git', 'init', '-q']); await command(root, ['git', 'add', '.']); await command(root, ['git', '-c', 'user.name=test', '-c', 'user.email=test@example.test', 'commit', '-qm', 'empty']);
  const plan = await planFor(root); assert.equal(validateGreenfieldPlan(plan).valid, true);
  const result = await scaffoldGreenfield(plan, root);
  assert.deepEqual(result.files, ['package.json', 'src/index.mjs', 'test/index.test.mjs']);
  assert.deepEqual(result.profile_before.languages, []); assert.deepEqual(result.profile_after.languages, ['JavaScript']);
  for (const argv of plan.baseline.commands) await command(root, argv);
  const runtime = await command(root, plan.baseline.runtime_command); assert.equal(runtime.stdout.trim().split(/\r?\n/).at(-1), plan.baseline.expected_output);
});

test('rejects unsafe paths, retained mechanisms outside the ladder, and non-accepted contracts', async () => {
  const plan = await fixture();
  plan.uncertainties.push({ schema_version: '1.0.0', uncertainty_id: 'unc_external', question: 'Is an external service required?', kind: 'external_fact', status: 'unresolved', materiality: 'medium', reversibility: 'moderate', consequential: false, downstream_dependency: false, rationale: 'Only research can establish this current fact if it becomes material.', evidence_references: [] });
  assert.equal(validateGreenfieldPlan(plan).valid, true);
  plan.files['../escape'] = 'no'; assert.equal(validateGreenfieldPlan(plan).valid, false);
  delete plan.files['../escape']; plan.subtraction_ladder.retained.push('network service'); assert.equal(validateGreenfieldPlan(plan).valid, false);
  plan.subtraction_ladder.retained.pop(); plan.contract.lifecycle_state = 'draft'; assert.equal(validateGreenfieldPlan(plan).valid, false);
});

test('uses the existing isolated executor and fresh verifier for the first greenfield slice', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'greenfield-flow-')); t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, '.gitkeep'), ''); await command(root, ['git', 'init', '-q']); await command(root, ['git', 'add', '.']); await command(root, ['git', '-c', 'user.name=test', '-c', 'user.email=test@example.test', 'commit', '-qm', 'empty']);
  const plan = await planFor(root);
  const graph = await compileTaskGraph({ graph_id: 'tgr_greenfield', contract: plan.contract, targetPath: root, tasks: [{ task_id: 'tsk_greenfield', title: 'Build first slice', objective: plan.charter.product, slice: 'vertical', criterion_ids: ['ac_counter'], depends_on: [], code_anchors: [{ path: '.', reason: 'The empty target is intentionally scaffolded at repository root.' }], verification: { commands: plan.baseline.commands.map((argv) => argv.join(' ')), proofs: ['All baseline gates and the runtime output pass independently.'] } }] });
  const [capsule] = await compileContextCapsules(graph, plan.contract, root);
  const authorization = await authorizeTaskExecution({ contract: plan.contract, graph, capsule, targetPath: root, signals: {} });
  const output = await executeAuthorizedTask({ authorization, contract: plan.contract, graph, capsule, targetPath: root, signals: {}, runExecutor: async ({ worktreePath }) => { await scaffoldGreenfield(plan, worktreePath, { checkBase: false }); for (const argv of plan.baseline.commands) await command(worktreePath, argv); return { argv: ['greenfield-scaffold'], exit_code: 0 }; }, runVerifier: async ({ input, worktreePath }) => { const runtime = await command(worktreePath, plan.baseline.runtime_command); const id = 'ver_tsk_greenfield_0'; const evidence = [{ category: 'command', summary: 'Generated project test, build, and typecheck gates passed.' }, { category: 'runtime', summary: `Runtime output: ${runtime.stdout.trim().split(/\r?\n/).at(-1)}.` }]; const verifier = { verifier_id: 'engineering-verifier', fresh_context_id: 'fresh-greenfield-0', separate_from_executor: true, executor_reasoning_available: false }; return { event: { schema_version: '1.0.0', verification_event_id: id, task_id: input.capsule.task_id, execution: { event_id: input.execution_event.event_id, change_identity: input.change_identity }, verifier, status: 'proven', rationale: 'Observed from a fresh verifier process.', evidence }, proofs: input.capsule.acceptance_criteria.map((criterion) => ({ schema_version: '1.0.0', proof_id: `prf_${criterion.criterion_id}_greenfield`, criterion_id: criterion.criterion_id, verification_event_id: id, execution: { event_id: input.execution_event.event_id, change_identity: input.change_identity }, verifier, status: 'proven', rationale: 'All declared greenfield gates passed.', evidence })) }; } });
  assert.equal(output.verification.status, 'verified'); assert.equal(output.events[1].result.status, 'unverified_implementation');
});
