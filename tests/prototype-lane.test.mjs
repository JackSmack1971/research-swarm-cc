import assert from 'node:assert/strict';
import { execFile as execute } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';
import { assertNoPrototypePromotion, createPrototypeWorktree, detectPrototypeSourceDrift, disposePrototypeWorktree, validatePrototypeExperiment } from '../scripts/lib/prototype-lane.mjs';
import { validateChangeContract } from '../scripts/lib/change-contract.mjs';
import { profileProject } from '../scripts/lib/project-profiler.mjs';

const execFile = promisify(execute);
const sha = 'a'.repeat(64);
const makeExperiment = (profile, location, verdict = 'accepted') => ({
  schema_version: '1.0.0', experiment_id: 'exp_fixture', question_id: 'Does the state transition feel reversible?', linked_uncertainty_id: 'unc_prototype', hypothesis: 'The first variant exposes the transition clearly.', variants: [{ variant_id: 'var_a', description: 'Use the existing visible state.' }, { variant_id: 'var_b', description: 'Use an alternate visible state.' }],
  base_revision: { repository_identity: 'temporary fixture', git_revision: profile.target.git_revision, source_fingerprint: profile.target.source_fingerprint }, isolation: { mechanism: 'git_worktree', location }, run: { instructions: ['Run the fixture test once.'], max_runs: 1 }, observations: verdict === 'inconclusive' ? [] : [{ observation_id: 'obs_fixture', statement: 'The chosen variant was observable.' }], verdict, decision_references: verdict === 'inconclusive' ? [] : ['dec_fixture'], prototype_artifacts: [{ path: path.join(location, 'prototype.js'), sha256: sha }], cleanup: { state: 'planned', disposed_at: null }
});

async function temporaryRepository(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'prototype-lane-repo-')); t.after(() => rm(root, { recursive: true, force: true }));
  await cp(path.resolve('tests/fixtures/project-profiler/node-web'), root, { recursive: true }); await execFile('git', ['init', '-q'], { cwd: root }); await execFile('git', ['add', '.'], { cwd: root }); await execFile('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.test', 'commit', '-qm', 'fixture'], { cwd: root });
  return root;
}

test('validates accepted, rejected, and inconclusive prototype records', async (t) => {
  const root = await temporaryRepository(t); const profile = await profileProject(root); const location = `${root}-worktree`;
  for (const verdict of ['accepted', 'rejected', 'inconclusive']) assert.equal(validatePrototypeExperiment(makeExperiment(profile, location, verdict)).valid, true);
  const invalid = makeExperiment(profile, location); invalid.decision_references = []; assert.equal(validatePrototypeExperiment(invalid).valid, false);
});

test('creates and disposes an isolated worktree, rejects drift, and rejects direct promotion', async (t) => {
  const root = await temporaryRepository(t); const profile = await profileProject(root); const location = `${root}-worktree`; const experiment = makeExperiment(profile, location);
  assert.equal((await detectPrototypeSourceDrift(experiment, root)).drifted, false); await createPrototypeWorktree(experiment, root); assert.equal(await createPrototypeWorktree(experiment, root).then(() => false).catch(() => true), true);
  assert.throws(() => assertNoPrototypePromotion(experiment, [path.join(location, 'prototype.js')]), /cannot be promoted directly/); assert.doesNotThrow(() => assertNoPrototypePromotion(experiment, [path.join(root, 'src', 'app.tsx')]));
  await writeFile(path.join(location, 'prototype.js'), 'temporary prototype\n'); await assert.rejects(() => disposePrototypeWorktree(experiment, root)); await rm(path.join(location, 'prototype.js'));
  const disposed = await disposePrototypeWorktree(experiment, root, () => '2026-08-01T00:00:00.000Z'); assert.equal(disposed.cleanup.state, 'disposed'); assert.equal(validatePrototypeExperiment(disposed).valid, true);
  await writeFile(path.join(root, 'src', 'app.tsx'), 'export const App = () => "changed";\n'); assert.equal((await detectPrototypeSourceDrift(experiment, root)).drifted, true);
});

test('a required prototype question keeps a contract draft until a decision-backed result resolves it', () => {
  const contract = { schema_version: '1.0.0', contract_id: 'chg_prototype', lifecycle_state: 'draft', owner: { kind: 'human', identifier: 'owner' }, goal: 'Test a contract.', outcome: 'A result is recorded.', base_repository: { identity: 'fixture', root: 'C:/fixture', git_revision: 'b'.repeat(40), git_dirty: false, source_fingerprint: sha }, evidence_references: ['epk_fixture'], decisions: [{ schema_version: '1.0.0', decision_id: 'dec_fixture', scope: 'Prototype result', outcome: 'Use the observed variant.', rationale: 'The experiment supplies evidence only.', alternatives: ['Use the other variant.'], evidence_references: ['epk_fixture'], decided_by: { kind: 'human', identifier: 'owner' }, decided_at: '2026-08-01T00:00:00.000Z', reversibility: 'easy' }], requirements: [{ requirement_id: 'req_fixture', statement: 'Record the decision.', decision_ids: ['dec_fixture'] }], acceptance_criteria: [{ criterion_id: 'ac_fixture', requirement_ids: ['req_fixture'], observable_proof: 'The decision is traceable.' }], constraints: [], non_goals: [], risks: [{ risk_id: 'rsk_fixture', dimension: 'uncertainty', level: 'low', rationale: 'Isolated experiment.' }], uncertainties: [{ schema_version: '1.0.0', uncertainty_id: 'unc_prototype', question: 'Which observable state works?', kind: 'experiential', status: 'unresolved', materiality: 'medium', reversibility: 'easy', consequential: false, downstream_dependency: true, rationale: 'Inspection cannot settle it.', evidence_references: [] }] };
  assert.equal(validateChangeContract(contract).valid, true); contract.lifecycle_state = 'resolved'; assert.equal(validateChangeContract(contract).valid, false);
  contract.uncertainties[0].status = 'resolved'; contract.prototype_experiments = [makeExperiment({ target: { git_revision: 'b'.repeat(40), source_fingerprint: sha } }, 'C:/prototype-fixture')]; assert.equal(validateChangeContract(contract).valid, true);
});

test('the prototype procedure stays manual, disposable, and non-executing', async () => {
  const skill = await readFile('.claude/skills/prototype-lane/SKILL.md', 'utf8');
  assert.match(skill, /^---\nname: prototype-lane\ndescription: .+\ndisable-model-invocation: true\n---/); assert.match(skill, /must not implement production code/i); assert.match(skill, /must not commit or push/i); assert.match(skill, /not a prototype swarm/i);
});
