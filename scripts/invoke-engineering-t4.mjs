import { readFile } from 'node:fs/promises';
import { createEngineeringT4Invocation } from './lib/engineering-t4-invocation.mjs';

try {
  if (process.argv.length !== 4) throw new Error('Usage: node scripts/invoke-engineering-t4.mjs <knowledge-need.json> <prior-evidence.json>');
  const need = JSON.parse(await readFile(process.argv[2], 'utf8'));
  const prior = JSON.parse(await readFile(process.argv[3], 'utf8'));
  process.stdout.write(`${JSON.stringify(createEngineeringT4Invocation({ need, ...prior }), null, 2)}\n`);
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
