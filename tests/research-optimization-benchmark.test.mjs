import assert from 'node:assert/strict';
import test from 'node:test';
import { collectArchiveBenchmark, predictAgentPath } from '../scripts/lib/research-optimization-benchmark.mjs';

test('structural benchmark predicts representative paths and keeps Deep all-material verification', () => {
  assert.equal(predictAgentPath({ requestedDepth: 'light', initialWorkerCount: 2 }).total_workflow_agents, 11);
  assert.equal(predictAgentPath({ requestedDepth: 'standard', initialWorkerCount: 3, verificationTargetCount: 4, evaluatorAgentCount: 1, learningMode: 'evaluate' }).total_workflow_agents, 17);
  const deep = predictAgentPath({ requestedDepth: 'standard', effectiveDepth: 'deep', initialWorkerCount: 4, verificationTargetCount: 20, admittedClaimCount: 20, evaluatorAgentCount: 1, learningMode: 'adapt' });
  assert.equal(deep.total_workflow_agents, 36);
  assert.throws(() => predictAgentPath({ requestedDepth: 'deep', verificationTargetCount: 19, admittedClaimCount: 20 }), /cover every admitted claim/);
});

test('archive benchmark collects only deterministic archive facts', async () => {
  const result = await collectArchiveBenchmark('tests/fixtures/valid-run-v2');
  assert.deepEqual(result.automatically_collectible, {
    requested_depth: null, effective_depth: 'standard', initial_worker_count: 1, gap_fill_workers: null,
    verification_target_count: null, verification_agent_count: 1, repair_agent_count: 0, evaluator_agent_count: 2,
    total_workflow_agents: null, sources: 1, admitted_claims: 1, retained_claims: 1, discarded_claims: 0,
    unresolved_coverage_gaps: 0, unresolved_conflicts: 0, semantic_validation_result: 'pass',
    deterministic_archive_validation_result: true, archive_validation_recorded_result: true, parse_errors: 0
  });
  assert.ok(result.manual_workflows_telemetry.includes('per_phase_token_totals'));
});
