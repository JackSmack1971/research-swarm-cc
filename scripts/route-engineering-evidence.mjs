import { readFile } from 'node:fs/promises';
import { routeKnowledgeNeed, routeKnowledgeNeedWithRepositoryEvidence } from './lib/adaptive-evidence-router.mjs';

try {
  const [needFile, targetPath] = process.argv.slice(2);
  if (!needFile || process.argv.length > 4) throw new Error('Usage: node scripts/route-engineering-evidence.mjs <knowledge-need.json> [absolute-repository-path]');
  const need = JSON.parse(await readFile(needFile, 'utf8'));
  const output = targetPath ? await routeKnowledgeNeedWithRepositoryEvidence(need, targetPath) : routeKnowledgeNeed(need);
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
