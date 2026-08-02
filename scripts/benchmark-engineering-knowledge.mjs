#!/usr/bin/env node
import { collectTieredEngineeringKnowledgeBenchmark } from './lib/engineering-knowledge-benchmark.mjs';
import { readFile } from 'node:fs/promises';

try {
  const file = process.argv[2] ?? 'tests/fixtures/engineering-knowledge-benchmark/suite.json';
  const suite = JSON.parse(await readFile(file, 'utf8'));
  process.stdout.write(`${JSON.stringify(collectTieredEngineeringKnowledgeBenchmark(suite), null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
