import assert from 'node:assert/strict';
import test from 'node:test';
import { executorContext, repairContext, verifierContext } from '../scripts/lib/context-projections.mjs';

const capsule = {
  task_id: 'tsk_fixture', objective: 'Make the fixture observable.',
  acceptance_criteria: [{ criterion_id: 'ac_fixture', requirement_ids: ['req_fixture'], observable_proof: 'The fixture passes.', required_proof_kinds: ['command'] }],
  decisions: [{ decision_id: 'dec_fixture', outcome: 'Use the existing fixture path.', rationale: 'It is reversible.', alternatives: ['Add a new path.'], evidence_references: ['epk_fixture'] }],
  non_goals: [{ id: 'ng_fixture', statement: 'Do not change the public API.' }],
  base_repository: { identity: 'fixture', root: 'C:/fixture', git_revision: 'a'.repeat(40), dirty: false, source_fingerprint: 'b'.repeat(64), observed_at: '2026-08-02T00:00:00.000Z' },
  evidence_references: ['epk_fixture'], code_anchors: [{ path: 'src/app.tsx', reason: 'Fixture behavior.' }],
  verification: { commands: ['npm test'], proofs: ['The fixture passes.'] },
  risks: [{ risk_id: 'rsk_fixture', dimension: 'scope', level: 'low', rationale: 'Narrow file.' }],
  stop_conditions: ['Stop on drift.']
};
const authorization = { allowed_autonomy: 'bounded_agent', isolation: 'isolated_worktree', tool_posture: 'narrow_write', verification_categories: ['task_verification'], proof_categories: ['command'], classification: { overall_level: 'low' }, profile_gates: [] };
const executionEvent = { event_id: 'exe_fixture', task_id: capsule.task_id, base_revision: capsule.base_repository.git_revision, file_changes: ['src/app.tsx'], worktree: { path: 'C:/tmp/task', branch: null }, commands: [{ argv: ['npm', 'test'], exit_code: 0 }], result: { status: 'unverified_implementation', change_identity: 'diff:fixture' } };

test('role projections are deterministic, omit canonical-only context, and reduce equivalent payloads', () => {
  const executor = executorContext(capsule, authorization);
  const verifier = verifierContext({ capsule, authorization, executionEvent, changeIdentity: 'diff:fixture' });
  const repair = repairContext({ capsule, defects: [{ criterion_id: 'ac_fixture', status: 'failed', rationale: 'No proof.' }], authorization, attempt: 1, changeIdentity: 'diff:fixture' });
  assert.deepEqual(executor, executorContext(capsule, authorization));
  assert.equal('base_repository' in executor, false); assert.equal('evidence_references' in executor, false);
  assert.equal('decisions' in verifier, false); assert.equal('rationale' in verifier, false);
  assert.equal('acceptance_criteria' in repair, false); assert.equal(repair.failed_criteria.length, 1);
  assert.ok(JSON.stringify(executor).length < JSON.stringify(capsule).length);
  assert.ok(JSON.stringify(verifier).length + JSON.stringify({ contract: { contract_id: 'con_fixture', sha256: 'c'.repeat(64) }, execution_event: executionEvent }).length < JSON.stringify({ contract: { contract_id: 'con_fixture', sha256: 'c'.repeat(64) }, capsule, execution_event: executionEvent }).length);
});
