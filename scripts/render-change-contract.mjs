import { readFile } from 'node:fs/promises';
import { detectChangeContractDrift, renderChangeContract, validateChangeContract } from './lib/change-contract.mjs';

try {
  if (![3, 5].includes(process.argv.length) || (process.argv.length === 5 && process.argv[3] !== '--check-base')) throw new Error('Usage: node scripts/render-change-contract.mjs <contract.json> [--check-base <target-directory>]');
  const contract = JSON.parse(await readFile(process.argv[2], 'utf8')); const result = validateChangeContract(contract);
  if (!result.valid) throw new Error(`Change contract validation failed: ${JSON.stringify(result.errors)}`);
  if (process.argv.length === 5) { const drift = await detectChangeContractDrift(contract, process.argv[4]); if (drift.drifted) throw new Error(`Change contract base drift detected: ${JSON.stringify(drift)}`); }
  process.stdout.write(renderChangeContract(contract));
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
