import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { collectTieredEngineeringKnowledgeBenchmark } from '../scripts/lib/engineering-knowledge-benchmark.mjs';

test('tiered architecture routes the representative suite and preserves unavailable telemetry', async () => {
  const suite = JSON.parse(await readFile('tests/fixtures/engineering-knowledge-benchmark/suite.json', 'utf8'));
  const result = collectTieredEngineeringKnowledgeBenchmark(suite);
  assert.deepEqual(result.route_counts, { T0: 3, T1: 1, T2: 2, T3: 1, T4: 3 });
  assert.equal(result.comparison.baseline_stage_count, 73);
  assert.equal(result.comparison.candidate_stage_count, 43);
  assert.equal(result.comparison.stage_reduction, 0.411);
  assert.ok(result.observations.every((item) => item.route_correctness === 'deterministic_route_validated' && item.exposed_tokens === null && item.latency_ms === null));
  assert.deepEqual(result.safety, { provenance_preserved: true, conflict_handling_preserved: true, non_authorizing: true, dormant_engineering_learning: true });
});
