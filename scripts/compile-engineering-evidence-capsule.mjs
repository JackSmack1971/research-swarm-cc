import { compileT4EngineeringEvidenceCapsule } from './lib/engineering-evidence-capsule.mjs';
import { readFile } from 'node:fs/promises';

try {
  if (process.argv.length !== 6) throw new Error('Usage: node scripts/compile-engineering-evidence-capsule.mjs <archive-directory> <knowledge-need.json> <claim-id[,claim-id...]> <selection-rationale>');
  const [archiveDirectory, needFile, ids, selection_rationale] = process.argv.slice(2);
  const need = JSON.parse(await readFile(needFile, 'utf8'));
  process.stdout.write(`${JSON.stringify(await compileT4EngineeringEvidenceCapsule({ archiveDirectory, need, claim_ids: ids.split(',').filter(Boolean), selection_rationale }), null, 2)}\n`);
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
