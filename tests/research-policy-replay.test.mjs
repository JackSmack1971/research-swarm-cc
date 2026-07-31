import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { evaluatePolicyCandidate } from '../scripts/evaluate-policy-candidate.mjs';
import { replayResearchPolicy } from '../scripts/replay-research-policy.mjs';

const baseline = { coverage: 0.7, citation_support: 0.8, conflict_disclosure: 0.7, calibration: 0.8, usefulness: 0.6, defects: 0, cost: 10, verbosity: 100 };
const improved = { ...baseline, usefulness: 0.8, cost: 9, verbosity: 130 };
const assessor = (id, candidate = improved) => ({ evaluator_id: id, baseline, candidate });
const input = (runs, changes = ['synthesis']) => ({ constitution_version: '1.0.0', candidate: { improvement_candidate_id: 'imp_fixture', policy_snapshot_id: 'psn_candidate', baseline_policy_snapshot_id: 'psn_base', constitution_version: '1.0.0', change_categories: changes }, runs });
const run = (id, evaluators = [assessor('evaluator_a'), assessor('evaluator_b')], extra = {}) => ({ run_id: id, archive_schema_version: '2.0.0', policy_snapshot_id: 'psn_base', ledger_preserved: true, evaluators, ...extra });

test('longer prose alone is not replay improvement', () => {
  const longer = { ...baseline, verbosity: 300 };
  const result = evaluatePolicyCandidate(input([run('run_one', [assessor('a', longer)]), run('run_two', [assessor('b', longer)])]));
  assert.equal(result.pass, false); assert.equal(result.improved_run_count, 0);
});

test('the deterministic replay fixture is a fixed-ledger post-retrieval comparison', async () => {
  const fixture = JSON.parse(await readFile('tests/fixtures/replay-policy/post-retrieval-candidate.json', 'utf8'));
  const result = replayResearchPolicy(fixture);
  assert.equal(result.runs[0].ledger_preserved, true); assert.equal(result.disposition, 'offline_evidence_only');
});

test('citation regression fails despite prose usefulness improvement', () => {
  const regression = { ...improved, citation_support: 0.7 };
  const result = evaluatePolicyCandidate(input([run('run_one', [assessor('a', regression)]), run('run_two', [assessor('b', regression)])]));
  assert.equal(result.pass, false); assert.ok(result.hard_gate_regressions.some(({ dimension }) => dimension === 'citation_support'));
});

test('retrieval lessons are never marked replay-proven', () => {
  const result = replayResearchPolicy(input([run('run_one')], ['search']));
  assert.equal(result.disposition, 'requires_live_canary'); assert.equal(result.outcome, 'inconclusive');
});

test('blinded evaluator ordering makes input order irrelevant and preserves disagreement', () => {
  const mixed = { ...baseline, usefulness: 0.4 };
  const first = evaluatePolicyCandidate(input([run('run_one', [assessor('z', improved), assessor('a', mixed)]), run('run_two')]));
  const second = evaluatePolicyCandidate(input([run('run_one', [assessor('a', mixed), assessor('z', improved)]), run('run_two')]));
  assert.deepEqual(first, second); assert.equal(first.evaluator_disagreement.length, 1);
});

test('tied result fails and a single-run gain cannot overfit into a pass', () => {
  const tied = evaluatePolicyCandidate(input([run('run_one', [assessor('a', baseline)]), run('run_two', [assessor('b', baseline)])]));
  const overfit = evaluatePolicyCandidate(input([run('run_one', [assessor('a')]), run('run_two', [assessor('b', baseline)]), run('run_three', [assessor('c', baseline)])]));
  assert.equal(tied.pass, false); assert.equal(overfit.pass, false);
});

test('missing baseline policy and old v1 archives are ineligible', () => {
  const result = evaluatePolicyCandidate(input([run('run_missing', [], { policy_snapshot_id: 'psn_other' }), run('run_v1', [], { archive_schema_version: '1.0.0' })]));
  assert.equal(result.eligible_run_count, 0); assert.deepEqual(result.runs.map(({ reason }) => reason), ['missing_baseline_policy', 'unsupported_archive_version']);
});

test('contradictory metrics remain visible and block a gate regression', () => {
  const result = evaluatePolicyCandidate(input([run('run_one', [assessor('a', improved), assessor('b', { ...improved, defects: 1 })]), run('run_two')]));
  assert.equal(result.pass, false); assert.equal(result.evaluator_disagreement.length, 1); assert.ok(result.hard_gate_regressions.some(({ dimension }) => dimension === 'defects'));
});
