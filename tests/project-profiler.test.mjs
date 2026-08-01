import assert from 'node:assert/strict';
import { execFile as execute } from 'node:child_process';
import { mkdtemp, cp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';
import { createCodeIntelligenceProvider, detectProfileDrift, profileProject, validateProjectProfile } from '../scripts/lib/project-profiler.mjs';

const execFile = promisify(execute);
const fixtures = path.join(process.cwd(), 'tests', 'fixtures', 'project-profiler');

test('profiles metadata-backed Node project capabilities deterministically', async () => {
  const profile = await profileProject(path.join(fixtures, 'node-web'), { now: () => '2026-08-01T00:00:00.000Z' });
  assert.deepEqual(profile.languages, ['TypeScript']);
  assert.deepEqual(profile.frameworks, ['Next.js', 'React']);
  assert.equal(profile.package_manager, 'npm');
  assert.deepEqual(profile.commands.run.values, ['npm run dev']);
  assert.deepEqual(profile.ci, ['.github/workflows/test.yml']);
  assert.deepEqual(profile.claude_code.capabilities, ['custom_agents', 'hooks', 'lsp_configuration', 'rules', 'settings', 'skills']);
  assert.equal(profile.code_intelligence_providers[0].availability, 'unknown');
  assert.equal(validateProjectProfile(profile).valid, true);
});

test('preserves unknowns instead of inventing Python commands or intelligence', async () => {
  const profile = await profileProject(path.join(fixtures, 'python-tool'));
  assert.deepEqual(profile.languages, ['Python']);
  assert.equal(profile.package_manager, null);
  assert.deepEqual(profile.commands.test.values, []);
  assert.ok(profile.known_unknowns.includes('test command is not declared in project metadata'));
  assert.ok(profile.known_unknowns.includes('no optional code-intelligence provider is configured'));
});

test('revision and content fingerprint expose dirty repository drift', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'project-profiler-')); t.after(() => rm(root, { recursive: true, force: true }));
  await cp(path.join(fixtures, 'node-web'), root, { recursive: true });
  await execFile('git', ['init', '-q'], { cwd: root }); await execFile('git', ['add', '.'], { cwd: root });
  await execFile('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.test', 'commit', '-qm', 'fixture'], { cwd: root });
  const profile = await profileProject(root); assert.equal(profile.target.git_dirty, false); assert.match(profile.target.git_revision, /^[a-f0-9]{40}$/);
  await writeFile(path.join(root, 'src', 'app.tsx'), 'export const App = () => "changed";\n');
  const result = await detectProfileDrift(profile, root); assert.equal(result.drifted, true); assert.equal(result.current.target.git_dirty, true);
});

test('rejects ambiguous paths and validates only declared provider capabilities', async () => {
  await assert.rejects(() => profileProject(path.parse(process.cwd()).root), /non-root directory/);
  await assert.rejects(() => profileProject('tests/fixtures/project-profiler/node-web'), /absolute directory/);
  assert.throws(() => createCodeIntelligenceProvider({ provider_id: 'x', capabilities: ['invented'] }), /Invalid/);
  assert.deepEqual(createCodeIntelligenceProvider({ provider_id: 'lsp', capabilities: ['references'], evidence: ['.lsp.json'] }).capabilities, ['references']);
});
