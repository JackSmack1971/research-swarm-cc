#!/usr/bin/env node
import { finalizeResearchRun } from './lib/research-finalization.mjs';

if (process.argv.length !== 3) {
  process.stdout.write(`${JSON.stringify({ valid: false, errors: [{ rule: 'cli.usage', message: 'Usage: node scripts/finalize-research-run.mjs <run-directory>' }] })}\n`);
  process.exitCode = 2;
} else {
  const result = await finalizeResearchRun(process.argv[2]);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.valid ? 0 : 1;
}
