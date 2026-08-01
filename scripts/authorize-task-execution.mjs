import { readFile } from 'node:fs/promises';
import { authorizeTaskExecution } from './lib/execution-authorization.mjs';
try {
  if (process.argv.length !== 6) throw new Error('Usage: node scripts/authorize-task-execution.mjs <contract.json> <graph.json> <capsule.json> <target-directory>');
  const read = (file) => readFile(file, 'utf8').then(JSON.parse);
  const authorization = await authorizeTaskExecution({ contract: await read(process.argv[2]), graph: await read(process.argv[3]), capsule: await read(process.argv[4]), targetPath: process.argv[5] });
  process.stdout.write(`${JSON.stringify(authorization, null, 2)}\n`);
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
