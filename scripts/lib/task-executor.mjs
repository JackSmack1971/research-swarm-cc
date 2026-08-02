import { execFile as execute } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import Ajv2020 from 'ajv/dist/2020.js';
import eventSchema from '../../engineering/schemas/execution-event.schema.json' with { type: 'json' };
import { authorizeTaskExecution, validateExecutionAuthorization } from './execution-authorization.mjs';
import { verifyAuthorizedTask } from './task-verifier.mjs';

const execFile = promisify(execute);
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validate = ajv.compile(eventSchema);
const git = (root, args) => execFile('git', ['-C', root, ...args], { windowsHide: true }).then(({ stdout }) => stdout.trim());
export async function changeIdentity(root) {
  const [diff, untracked] = await Promise.all([git(root, ['diff', '--binary']), git(root, ['ls-files', '--others', '--exclude-standard'])]);
  const files = untracked.split(/\r?\n/).filter(Boolean).sort(); const contents = await Promise.all(files.map(async (file) => `${file}\0${(await readFile(path.join(root, file))).toString('base64')}`));
  const value = `${diff}\0${contents.join('\0')}`; return value === '\0' ? null : `diff:${createHash('sha256').update(value).digest('base64url')}`;
}
const stable = (value) => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value);
const freeze = (value) => { if (value && typeof value === 'object') { for (const item of Object.values(value)) freeze(item); Object.freeze(value); } return value; };
const event = (kind, base_revision, task_id, worktree, commands, file_changes, status, change_identity = null) => freeze({ schema_version: '1.0.0', event_id: `exe_${task_id}_${kind}`, kind, base_revision, task_id, worktree: { ...worktree }, commands: commands.map((item) => ({ ...item, argv: [...item.argv] })), file_changes: [...file_changes], result: { status, change_identity } });
const scope = (files, anchors, protectedPaths) => files.every((file) => !protectedPaths.some((item) => file === item || file.startsWith(`${item}/`)) && anchors.some((anchor) => anchor.path === '.' || file === anchor.path || file.startsWith(`${anchor.path}/`) || anchor.path.startsWith(`${file}/`)));

export function validateExecutionEvent(record) { return validate(record) ? { valid: true, errors: [] } : { valid: false, errors: validate.errors }; }

export async function executeAuthorizedTask({ authorization, contract, graph, capsule, targetPath, signals, runExecutor, runVerifier, runRepair, implementationAgentId = 'engineering-executor', verifierAgentId = 'engineering-verifier', protectedPaths = ['engineering/contracts', 'engineering/authorizations', 'engineering/tasks', 'engineering/evidence'] }) {
  const refreshed = await authorizeTaskExecution({ contract, graph, capsule, targetPath, signals });
  if (!validateExecutionAuthorization(authorization).valid || stable(authorization) !== stable(refreshed)) throw new Error('Execution authorization drift detected immediately before execution.');
  if (authorization.status !== 'authorized' || authorization.allowed_autonomy !== 'bounded_agent' || authorization.tool_posture !== 'narrow_write') throw new Error('Authorization does not permit bounded implementation.');
  if (authorization.isolation !== 'isolated_worktree') throw new Error('Production executor requires isolated-worktree authorization.');
  const base_revision = await git(targetPath, ['rev-parse', 'HEAD']);
  const root = await mkdtemp(path.join(os.tmpdir(), 'research-swarm-executor-'));
  const worktreePath = path.join(root, 'task'); const worktree = { path: worktreePath, branch: null }; const commands = [];
  try {
    await git(targetPath, ['worktree', 'add', '--detach', worktreePath, base_revision]);
    commands.push({ argv: ['git', 'worktree', 'add', '--detach', worktreePath, base_revision], exit_code: 0 });
    const preflight = event('preflight', base_revision, capsule.task_id, worktree, commands, [], 'stopped');
    if (!validateExecutionEvent(preflight).valid) throw new Error('Execution preflight record is invalid.');
    const result = await runExecutor({ worktreePath, capsule, model: 'sonnet', effort: authorization.classification.overall_level === 'medium' ? 'medium' : 'low' });
    commands.push({ argv: result.argv, exit_code: result.exit_code });
    if (result.exit_code !== 0) return { events: [preflight, event('stop', base_revision, capsule.task_id, worktree, commands, [], 'stopped')], worktreePath };
    const file_changes = [...new Set([...(await git(worktreePath, ['diff', '--name-only'])).split(/\r?\n/), ...(await git(worktreePath, ['ls-files', '--others', '--exclude-standard'])).split(/\r?\n/)].filter(Boolean))].sort();
    if (!scope(file_changes, capsule.code_anchors, protectedPaths)) return { events: [preflight, event('scope_rejected', base_revision, capsule.task_id, worktree, commands, file_changes, 'rejected')], worktreePath };
    const change_identity = await changeIdentity(worktreePath);
    const complete = event('complete', base_revision, capsule.task_id, worktree, commands, file_changes, 'unverified_implementation', change_identity);
    const verification = typeof runVerifier === 'function' ? await verifyAuthorizedTask({ contract, graph, capsule, authorization, executionEvent: complete, implementationAgentId, verifierAgentId, runVerifier: (input) => runVerifier({ ...input, worktreePath }), runRepair: typeof runRepair === 'function' ? (input) => runRepair({ ...input, worktreePath, capsule }) : undefined }) : null;
    return { events: [preflight, complete], verification, worktreePath };
  } finally { await git(targetPath, ['worktree', 'remove', '--force', worktreePath]).catch(() => {}); await rm(root, { recursive: true, force: true }); }
}
