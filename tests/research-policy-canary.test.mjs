import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceCandidate, assignAndRecordCanary, assignCanary, eligibleForCanary } from '../scripts/lib/research-policy-canary.mjs';

const candidate = (extra = {}) => ({ improvement_candidate_id: 'imp_one', policy_snapshot_id: 'psn_candidate', baseline_policy_snapshot_id: 'psn_base', candidate_policy_bundle: { policy_bundle_id: 'pob_candidate' }, rollback_snapshot: { policy_snapshot_id: 'psn_base', policy_bundle: { policy_bundle_id: 'pob_base' } }, status: 'proposed', constitution_compatible: true, risk: 'low', active_lesson_evidence_count: 1, bounded_directive: true, replay_passed: true, change_categories: ['synthesis'], ...extra });
const outcome = (run_id, extra = {}) => ({ improvement_candidate_id: 'imp_one', policy_used: 'candidate', run_id, completed: true, malformed: false, quality: 'improved', ...extra });

test('assigns exactly one eligible candidate deterministically', () => {
  const candidates = [candidate({ status: 'canary' }), candidate({ improvement_candidate_id: 'imp_two', status: 'canary' })];
  assert.deepEqual(assignCanary(candidates, 'run_one'), assignCanary([...candidates].reverse(), 'run_one'));
  assert.ok(['imp_one', 'imp_two'].includes(assignCanary(candidates, 'run_one').improvement_candidate_id));
  assert.equal(assignAndRecordCanary({ candidates }, 'run_one').canary_assignments[0].policy, 'candidate');
});

test('requires complete eligibility and three independent quality wins before promotion', () => {
  assert.equal(eligibleForCanary(candidate()), true);
  assert.equal(eligibleForCanary(candidate({ unresolved_conflicting_lesson_ids: ['les_conflict'] })), false);
  assert.equal(eligibleForCanary(candidate({ change_categories: ['synthesis'], replay_passed: false })), false);
  assert.equal(eligibleForCanary(candidate({ change_categories: ['search'], replay_passed: false })), true);
  assert.equal(eligibleForCanary(candidate({ change_categories: ['serialization'], targeted_execution_passed: false })), false);
  assert.equal(advanceCandidate(candidate(), [outcome('run_one'), outcome('run_two')]).status, 'canary');
  assert.equal(advanceCandidate(candidate(), [outcome('run_one'), outcome('run_two'), outcome('run_three'), outcome('run_bad', { completed: false })]).status, 'promoted');
});

test('rolls back critical or consecutive candidate regressions but ignores unrelated failure', () => {
  const critical = advanceCandidate(candidate(), [outcome('run_one', { critical_provenance_regression: true })], '2026-07-31T00:00:00Z');
  assert.equal(critical.status, 'rolled_back'); assert.deepEqual(critical.rollback.restored_policy_snapshot, candidate().rollback_snapshot);
  assert.equal(advanceCandidate(candidate(), [outcome('run_one', { high_severity_regression: true }), outcome('run_two', { high_severity_regression: true })]).status, 'rolled_back');
  assert.equal(advanceCandidate(candidate(), [{ run_id: 'run_other', policy_used: 'baseline', validator_failure_attributable: true }]).status, 'canary');
});

test('user harm rolls back, corrupt snapshots reject, and rollback cooldown blocks immediate re-entry', () => {
  assert.equal(advanceCandidate(candidate(), [outcome('run_one', { user_correction_harm: true })]).status, 'rolled_back');
  assert.equal(advanceCandidate(candidate({ rollback_snapshot: {} }), [outcome('run_one', { critical_security_regression: true })]).status, 'rejected');
  const rolled = advanceCandidate(candidate(), [outcome('run_one', { critical_security_regression: true })], '2026-07-31T00:00:00Z');
  assert.equal(eligibleForCanary({ ...candidate({ status: 'proposed' }), cooldown_until: rolled.cooldown_until }, '2026-07-31T01:00:00Z'), false);
});
