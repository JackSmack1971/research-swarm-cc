#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { collectEngineeringBenchmark, compareEngineeringBenchmarks } from './lib/engineering-benchmark.mjs';
try {
  if (![3, 4].includes(process.argv.length)) throw new Error('Usage: node scripts/benchmark-engineering.mjs <run.json> [candidate-run.json]');
  const baseline = JSON.parse(await readFile(process.argv[2], 'utf8')); const candidate = process.argv[3] ? JSON.parse(await readFile(process.argv[3], 'utf8')) : null;
  process.stdout.write(`${JSON.stringify(candidate ? compareEngineeringBenchmarks(baseline, candidate) : collectEngineeringBenchmark(baseline), null, 2)}\n`);
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
