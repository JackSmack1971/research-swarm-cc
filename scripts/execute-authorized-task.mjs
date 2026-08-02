#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { changeIdentity, executeAuthorizedTask } from './lib/task-executor.mjs';
const run = promisify(execFile);
try {
  if (process.argv.length !== 7) throw new Error('Usage: node scripts/execute-authorized-task.mjs <authorization.json> <contract.json> <graph.json> <capsule.json> <target-directory>');
  const read = (file) => readFile(file, 'utf8').then(JSON.parse);
  const [authorization, contract, graph, capsule] = await Promise.all(process.argv.slice(2, 6).map(read));
  const launch = async (agent, prompt, worktreePath, model = 'sonnet', effort = 'medium', permissionMode = 'acceptEdits') => {
    const argv = ['--agent', agent, '--model', model, '--effort', effort, '--permission-mode', permissionMode, '-p', prompt];
    try { const { stdout } = await run('claude', argv, { cwd: worktreePath, windowsHide: true, maxBuffer: 1024 * 1024 }); return { argv: ['claude', ...argv], exit_code: 0, stdout }; } catch (error) { return { argv: ['claude', ...argv], exit_code: error.code ?? 1, stdout: '' }; }
  };
  const output = await executeAuthorizedTask({ authorization, contract, graph, capsule, targetPath: process.argv[6], runExecutor: async ({ worktreePath, capsule: task, model, effort }) => {
    const argv = ['--agent', 'engineering-executor', '--model', model, '--effort', effort, '--permission-mode', 'acceptEdits', '-p', `Implement only this authorized capsule. Stop on scope/risk/architecture discovery. Do not commit, merge, push, deploy, or change planning state.\n${JSON.stringify(task)}`];
    try { await run('claude', argv, { cwd: worktreePath, windowsHide: true }); return { argv: ['claude', ...argv], exit_code: 0 }; } catch (error) { return { argv: ['claude', ...argv], exit_code: error.code ?? 1 }; }
  }, runVerifier: async ({ input, worktreePath }) => { const result = await launch('engineering-verifier', `Return JSON only with { event, proofs }. Verify this supplied context only; executor reasoning is unavailable.\n${JSON.stringify(input)}`, worktreePath, 'sonnet', 'medium', 'default'); if (result.exit_code) throw new Error('Independent verifier did not complete.'); return JSON.parse(result.stdout); }, runRepair: async ({ capsule: task, worktreePath }) => { const result = await launch('engineering-executor', `Repair only these identified defects in this authorized task view. Do not verify, commit, merge, push, deploy, or change planning state.\n${JSON.stringify(task)}`, worktreePath); if (result.exit_code) return null; return { change_identity: await changeIdentity(worktreePath) }; } });
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
