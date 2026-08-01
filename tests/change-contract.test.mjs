import assert from 'node:assert/strict';
import { execFile as execute } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';
import { detectChangeContractDrift, renderChangeContract, validateChangeContract } from '../scripts/lib/change-contract.mjs';
import { profileProject } from '../scripts/lib/project-profiler.mjs';

const execFile = promisify(execute);
const fixtures = path.resolve('tests/fixtures/change-contract');
const fixture = async (name) => JSON.parse(await readFile(path.join(fixtures, `${name}.json`), 'utf8'));

test('valid draft and accepted contracts validate, and rendering is deterministic', async () => {
  const draft = await fixture('valid-draft'); const accepted = await fixture('valid-accepted');
  assert.equal(validateChangeContract(draft).valid, true); assert.equal(validateChangeContract(accepted).valid, true);
  assert.equal(renderChangeContract(draft), renderChangeContract(draft)); assert.match(renderChangeContract(accepted), /## Acceptance criteria/);
});

test('accepted contracts reject execution-relevant uncertainty and broken decision or criterion lineage', async () => {
  const contract = await fixture('valid-accepted');
  contract.uncertainties.push({ ...(await fixture('valid-draft')).uncertainties[0], downstream_dependency: true });
  assert.equal(validateChangeContract(contract).valid, false);
  contract.uncertainties = []; contract.requirements[0].decision_ids = ['dec_missing'];
  assert.equal(validateChangeContract(contract).valid, false);
  contract.requirements[0].decision_ids = ['dec_fixture']; contract.acceptance_criteria[0].requirement_ids = ['req_missing'];
  assert.equal(validateChangeContract(contract).valid, false);
});

test('rejects duplicate IDs and invalid traceable deltas', async () => {
  const contract = await fixture('valid-accepted'); contract.requirements.push({ ...contract.requirements[0] });
  assert.equal(validateChangeContract(contract).valid, false);
  const delta = await fixture('valid-accepted'); delta.change_relationship = { parent_contract_id: 'chg_parent', parent_contract_sha256: 'b'.repeat(64), deltas: [{ operation_id: 'dop_fixture', operation: 'modify', entity_type: 'requirement', rationale: 'Clarify proof.', previous: { id: 'req_fixture', sha256: 'c'.repeat(64) }, next: { id: 'req_changed', sha256: 'd'.repeat(64) } }] };
  assert.equal(validateChangeContract(delta).valid, false);
  delta.change_relationship.deltas[0].next.id = 'req_fixture'; assert.equal(validateChangeContract(delta).valid, true);
});

test('detects a stale profiled base revision and CLI rejects it', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'change-contract-')); t.after(() => rm(root, { recursive: true, force: true }));
  await cp(path.resolve('tests/fixtures/project-profiler/node-web'), root, { recursive: true });
  await execFile('git', ['init', '-q'], { cwd: root }); await execFile('git', ['add', '.'], { cwd: root }); await execFile('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.test', 'commit', '-qm', 'fixture'], { cwd: root });
  const profile = await profileProject(root); const contract = await fixture('valid-accepted'); contract.base_repository = { identity: 'temporary fixture', root: profile.target.root, git_revision: profile.target.git_revision, git_dirty: profile.target.git_dirty, source_fingerprint: profile.target.source_fingerprint };
  assert.equal((await detectChangeContractDrift(contract)).drifted, false);
  await writeFile(path.join(root, 'src', 'app.tsx'), 'export const App = () => "changed";\n'); assert.equal((await detectChangeContractDrift(contract)).drifted, true);
  const file = path.join(root, 'contract.json'); await writeFile(file, `${JSON.stringify(contract)}\n`);
  await assert.rejects(() => execFile('node', ['scripts/render-change-contract.mjs', file, '--check-base', root]), /base drift/);
});
