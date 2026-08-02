import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { collectEngineeringKnowledgeBenchmark } from '../scripts/lib/engineering-knowledge-benchmark.mjs';

test('covers the ten engineering-knowledge classes and preserves unavailable telemetry as null', async () => {
  const suite = JSON.parse(await readFile('tests/fixtures/engineering-knowledge-benchmark/suite.json', 'utf8'));
  const result = collectEngineeringKnowledgeBenchmark(suite);
  assert.equal(result.case_count, 10);
  assert.deepEqual(result.route_counts, { repository_inspection: 3, research_evidence: 7 });
  assert.equal(new Set(result.observations.map(({ class: name }) => name)).size, 10);
  assert.ok(result.observations.every(({ model_facing_payload_bytes, sources_produced, claims_produced, telemetry }) => model_facing_payload_bytes === null && sources_produced === null && claims_produced === null && Object.values(telemetry).every((value) => value === null)));
});

test('routes high-consequence external evidence to research without converting it into a decision', async () => {
  const suite = JSON.parse(await readFile('tests/fixtures/engineering-knowledge-benchmark/suite.json', 'utf8'));
  const result = collectEngineeringKnowledgeBenchmark(suite);
  const item = result.observations.find(({ class: name }) => name === 'high_consequence_conflicting_external_evidence');
  assert.equal(item.route, 'research_evidence');
  assert.deepEqual(item.stages, ['plan', 'research', 'normalize', 'select_verification', 'verify', 'adjudicate', 'synthesize', 'semantic_validation', 'repair', 'persist']);
  assert.match(item.evidence_use, /conflict/i);
});
