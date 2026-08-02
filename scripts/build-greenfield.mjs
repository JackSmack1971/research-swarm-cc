#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { scaffoldGreenfield } from './lib/greenfield-builder.mjs';
try {
  if (process.argv.length !== 4) throw new Error('Usage: node scripts/build-greenfield.mjs <plan.json> <absolute-target-directory>');
  const plan = JSON.parse(await readFile(process.argv[2], 'utf8'));
  const result = await scaffoldGreenfield(plan, process.argv[3]);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
