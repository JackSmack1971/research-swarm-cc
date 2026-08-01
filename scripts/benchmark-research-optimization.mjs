#!/usr/bin/env node
import { collectArchiveBenchmark } from './lib/research-optimization-benchmark.mjs';

if (process.argv.length !== 3) {
  process.stdout.write(`${JSON.stringify({ error: 'Usage: node scripts/benchmark-research-optimization.mjs <run-directory>' })}\n`);
  process.exitCode = 2;
} else {
  try {
    process.stdout.write(`${JSON.stringify(await collectArchiveBenchmark(process.argv[2]))}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ error: error.message })}\n`);
    process.exitCode = 1;
  }
}
