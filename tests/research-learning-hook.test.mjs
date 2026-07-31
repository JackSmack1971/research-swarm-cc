import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readState, writeState } from '../scripts/lib/research-learning.mjs';

const root = () => mkdtemp(path.join(os.tmpdir(), 'research-learning-hook-'));
const command = (file, args = [], env = {}) => new Promise((resolve, reject) => execFile(process.execPath, [file, ...args], { env: { ...process.env, ...env }, windowsHide: true }, (error, stdout, stderr) => error ? reject(Object.assign(error, { stdout, stderr })) : resolve(JSON.parse(stdout))));
const active = { lesson_id: 'les_public', type: 'quality', target: { role: 'research-worker', policy_surface: 'worker' }, applicability_conditions: ['fixture'], exclusions: [], observed_problem: 'private query text must not leak', root_cause: 'private report text must not leak', recommended_behavior: 'Use bounded evidence.', supporting_run_ids: ['run_fixture'], counterexample_run_ids: [], evidence_authority: 'deterministic_defect', confidence: .8, risk: 'low', status: 'active', promotion_event_id: 'prm_fixture', constitution_compatibility: { constitution_version: '1.0.0', result: 'compatible' }, version: '1.0.0' };

test('pause, resume, rebuild, rollback, explain, and redacted status use only learning state', async (t) => {
  const stateRoot = await root(); t.after(() => rm(stateRoot, { recursive: true, force: true }));
  await writeState(stateRoot, { manifest: {}, provisional: [], active: [active], rejected: [], expired: [], superseded: [], rolledBack: [], promotions: [], events: [], feedback: [], critic: [], candidates: [{ candidate_id: 'pc_one', status: 'canary' }], canary_assignments: [] });
  const env = { RESEARCH_LEARNING_ROOT: stateRoot };
  const status = await command('scripts/research-learning-control.mjs', ['status'], env); assert.equal(status.health, 'healthy'); assert.deepEqual(status.active_lessons, ['les_public']); assert.doesNotMatch(JSON.stringify(status), /private (query|report)/i);
  const explain = await command('scripts/research-learning-control.mjs', ['explain', 'les_public'], env); assert.deepEqual(explain.supporting_run_ids, ['run_fixture']); assert.doesNotMatch(JSON.stringify(explain), /private (query|report)/i);
  assert.equal((await command('scripts/research-learning-control.mjs', ['pause'], env)).paused, true); assert.equal((await readState(stateRoot)).manifest.paused, true);
  assert.equal((await command('scripts/research-learning-control.mjs', ['resume'], env)).paused, false); const rebuilt = await command('scripts/research-learning-control.mjs', ['rebuild'], env); assert.ok(rebuilt.policy_bundle_id);
  const snapshot = (await command('scripts/research-learning-control.mjs', ['status'], env)).rollback.available_snapshots.at(-1); const rolled = await command('scripts/research-learning-control.mjs', ['rollback', snapshot], env); assert.equal(rolled.restored, snapshot); assert.ok((await readState(stateRoot)).events.some((event) => event.type === 'rollback_restore'));
});

test('Stop recovery never recurses or blocks malformed, missing-project, locked, corrupt, or paused state', async (t) => {
  const stateRoot = await root(); t.after(() => rm(stateRoot, { recursive: true, force: true }));
  await writeState(stateRoot, { manifest: { paused: true }, provisional: [], active: [], rejected: [], expired: [], superseded: [], rolledBack: [], promotions: [], events: [], feedback: [], critic: [], candidates: [], canary_assignments: [] });
  const recursive = await command('scripts/hook-smoke-test.mjs', ['tests/fixtures/research-learning-hook/recursive.json'], { CLAUDE_PROJECT_DIR: 'C:\\TEST repos\\research-swarm-cc-main' }); assert.equal(recursive.valid, true);
  const malformed = await command('scripts/hook-smoke-test.mjs', ['tests/fixtures/research-learning-hook/malformed.json']); assert.equal(malformed.valid, true);
  const missingProject = await command('scripts/hook-smoke-test.mjs', ['tests/fixtures/research-learning-hook/malformed.json'], { CLAUDE_PROJECT_DIR: '' }); assert.equal(missingProject.valid, true);
  assert.equal((await readState(stateRoot)).manifest.paused, true);
});

test('Stop recovery registers a validated v2 archive exactly once', async (t) => {
  const runs = await root(); const stateRoot = await root(); t.after(() => Promise.all([rm(runs, { recursive: true, force: true }), rm(stateRoot, { recursive: true, force: true })]));
  const archive = path.join(runs, 'run_fixture'); await cp('tests/fixtures/valid-run-v2', archive, { recursive: true }); const manifest = JSON.parse(await readFile(path.join(archive, 'manifest.json'), 'utf8')); manifest.run_directory = archive; await writeFile(path.join(archive, 'manifest.json'), JSON.stringify(manifest));
  const env = { CLAUDE_PROJECT_DIR: process.cwd(), RESEARCH_RUN_ROOT: runs, RESEARCH_LEARNING_ROOT: stateRoot };
  assert.equal((await command('scripts/hook-smoke-test.mjs', ['tests/fixtures/research-learning-hook/stop.json'], env)).valid, true);
  assert.equal((await command('scripts/hook-smoke-test.mjs', ['tests/fixtures/research-learning-hook/stop.json'], env)).valid, true);
  const state = await readState(stateRoot); assert.deepEqual(state.manifest.registered_run_ids, ['run_fixture']); assert.equal(state.provisional.length, 1);
});

test('hook config, commands, and Windows quoting are locally valid', async () => {
  assert.deepEqual(await command('scripts/doctor-research-learning-hooks.mjs'), { valid: true });
  const settings = await readFile('.claude/settings.json', 'utf8'); assert.match(settings, /node \\\"\$\{CLAUDE_PROJECT_DIR\}\/scripts\/recover-research-learning\.mjs\\\"/);
  for (const name of ['status', 'explain', 'pause', 'resume', 'rollback', 'rebuild']) assert.match(await readFile(`.claude/commands/research-learning-${name}.md`, 'utf8'), /research-learning-control\.mjs/);
});
