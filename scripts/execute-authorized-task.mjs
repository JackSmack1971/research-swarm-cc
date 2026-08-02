#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { executeAuthorizedTask } from './lib/task-executor.mjs';
const run = promisify(execFile);
try {
  if (process.argv.length !== 7) throw new Error('Usage: node scripts/execute-authorized-task.mjs <authorization.json> <contract.json> <graph.json> <capsule.json> <target-directory>');
  const read = (file) => readFile(file, 'utf8').then(JSON.parse);
  const [authorization, contract, graph, capsule] = await Promise.all(process.argv.slice(2, 6).map(read));
  const output = await executeAuthorizedTask({ authorization, contract, graph, capsule, targetPath: process.argv[6], runExecutor: async ({ worktreePath, capsule: task, model, effort }) => {
    const argv = ['--agent', 'engineering-executor', '--model', model, '--effort', effort, '--permission-mode', 'acceptEdits', '-p', `Implement only this authorized capsule. Stop on scope/risk/architecture discovery. Do not commit, merge, push, deploy, or change planning state.\n${JSON.stringify(task)}`];
    try { await run('claude', argv, { cwd: worktreePath, windowsHide: true }); return { argv: ['claude', ...argv], exit_code: 0 }; } catch (error) { return { argv: ['claude', ...argv], exit_code: error.code ?? 1 }; }
  } });
  process.stdout.write(`${JSON.stringify(output.events, null, 2)}\n`);
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
