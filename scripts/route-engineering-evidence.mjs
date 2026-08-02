import { readFile } from 'node:fs/promises';
import { routeKnowledgeNeed } from './lib/adaptive-evidence-router.mjs';

try {
  if (process.argv.length !== 3) throw new Error('Usage: node scripts/route-engineering-evidence.mjs <knowledge-need.json>');
  process.stdout.write(`${JSON.stringify(routeKnowledgeNeed(JSON.parse(await readFile(process.argv[2], 'utf8'))), null, 2)}\n`);
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
