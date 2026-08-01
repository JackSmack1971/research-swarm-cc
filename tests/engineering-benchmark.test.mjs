import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { collectEngineeringBenchmark, compareEngineeringBenchmarks, validateEngineeringBenchmark } from '../scripts/lib/engineering-benchmark.mjs';

const fixture = async () => JSON.parse(await readFile('tests/fixtures/engineering-benchmark/suite.json', 'utf8'));
test('validates the representative safe suite and preserves unavailable telemetry', async () => {
  const run = await fixture(); const checked = validateEngineeringBenchmark(run);
  assert.equal(checked.valid, true); assert.equal(new Set(run.suite.tasks.map((item) => item.class)).size, 9);
  const collected = collectEngineeringBenchmark(run); assert.equal(collected.acceptance.passed, 1); assert.deepEqual(collected.unavailable_telemetry, ['tokens', 'milliseconds']);
});
test('rejects misaligned results and reports comparison safety regressions without declaring a winner', async () => {
  const baseline = await fixture(); const malformed = structuredClone(baseline); malformed.results[0].task_id = 'ebt_missing';
  assert.equal(validateEngineeringBenchmark(malformed).valid, false);
  const candidate = structuredClone(baseline); candidate.arm = 'candidate'; candidate.run_id = 'bnr_candidate'; candidate.results[0].regressions.push('fixture regression'); candidate.results[0].safety_gates[0].status = 'failed';
  const comparison = compareEngineeringBenchmarks(baseline, candidate); assert.deepEqual(comparison.safety_regressions, ['ebt_bug:no production target', 'ebt_bug:fixture regression']); assert.equal('winner' in comparison, false);
  candidate.arm = 'plain_claude'; assert.throws(() => compareEngineeringBenchmarks(baseline, candidate), /plain-Claude baseline/);
});
test('copies deterministic fixtures fresh for every run and keeps recorded collection reproducible', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engineering-benchmark-')); t.after(() => rm(root, { recursive: true, force: true }));
  await cp('tests/fixtures/engineering-benchmark/safe-brownfield', root, { recursive: true }); await writeFile(path.join(root, 'totals.mjs'), 'changed\\n');
  assert.match(await readFile('tests/fixtures/engineering-benchmark/safe-brownfield/totals.mjs', 'utf8'), /end - start;/);
  const first = collectEngineeringBenchmark(await fixture()); const second = collectEngineeringBenchmark(await fixture()); assert.deepEqual(first, second);
});
