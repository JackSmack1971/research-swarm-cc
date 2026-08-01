import { readFile } from 'node:fs/promises';
import { routeUncertainty } from './lib/decision-router.mjs';

try {
  if (process.argv.length !== 3) throw new Error('Usage: node scripts/route-engineering-uncertainty.mjs <uncertainty.json>');
  process.stdout.write(`${JSON.stringify(routeUncertainty(JSON.parse(await readFile(process.argv[2], 'utf8'))), null, 2)}\n`);
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
