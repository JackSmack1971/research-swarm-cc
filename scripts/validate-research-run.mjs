#!/usr/bin/env node
import { validateResearchRun } from './lib/research-validation.mjs';

if (process.argv.length !== 3) {
  process.stdout.write(`${JSON.stringify({ valid: false, errors: [{ file: null, entity_id: null, rule: 'cli.usage', message: 'Usage: node scripts/validate-research-run.mjs <run-directory>' }] })}\n`);
  process.exitCode = 2;
} else {
  const result = await validateResearchRun(process.argv[2]);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.valid ? 0 : 1;
}
