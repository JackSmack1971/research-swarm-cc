#!/usr/bin/env node
import { collectEngineeringKnowledgeBenchmarkFile } from './lib/engineering-knowledge-benchmark.mjs';

try {
  const file = process.argv[2] ?? 'tests/fixtures/engineering-knowledge-benchmark/suite.json';
  process.stdout.write(`${JSON.stringify(await collectEngineeringKnowledgeBenchmarkFile(file), null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
