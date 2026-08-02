#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { registerEngineeringEvidence } from './lib/engineering-learning.mjs';
try {
  if (process.argv.length !== 4) throw new Error('Usage: node scripts/register-engineering-learning.mjs <evidence.json> <lesson.json>');
  const evidence = JSON.parse(await readFile(process.argv[2], 'utf8')); const lesson = JSON.parse(await readFile(process.argv[3], 'utf8'));
  process.stdout.write(`${JSON.stringify(await registerEngineeringEvidence({ evidence, lesson }), null, 2)}\n`);
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
