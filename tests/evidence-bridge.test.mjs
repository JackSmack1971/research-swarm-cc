import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { compileEvidencePacket, validateEvidencePacket } from '../scripts/lib/evidence-bridge.mjs';

const fixture = path.resolve('tests/fixtures/valid-run-v2');
async function archive(t, mutate = async () => {}) { const directory = await mkdtemp(path.join(os.tmpdir(), 'evidence-bridge-')); await cp(fixture, directory, { recursive: true }); const manifestFile = path.join(directory, 'manifest.json'); const manifest = JSON.parse(await readFile(manifestFile, 'utf8')); manifest.run_directory = directory; await writeFile(manifestFile, `${JSON.stringify(manifest)}\n`); await mutate(directory); t.after(() => import('node:fs/promises').then(({ rm }) => rm(directory, { recursive: true, force: true }))); return directory; }
async function confirmed(directory) { const file = path.join(directory, 'verification-events.jsonl'); const event = JSON.parse(await readFile(file, 'utf8')); event.outcome = 'confirmed'; event.rationale = 'Independent check confirmed the fixture record.'; await writeFile(file, `${JSON.stringify(event)}\n`); }
const input = (archiveDirectory) => ({ archiveDirectory, packet_id: 'epk_fixture', engineering_question: 'Should engineering consider the fixture record?', selection_rationale: 'The retained fixture claim directly addresses this narrow question.', claim_ids: ['clm_fixture'] });

test('compiles a scoped, provenance-traceable packet from a valid confirmed archive', async (t) => {
  const directory = await archive(t, confirmed); const packet = await compileEvidencePacket(input(directory));
  assert.equal(validateEvidencePacket(packet).valid, true); assert.equal(packet.research_run.run_id, 'run_fixture'); assert.equal(packet.sources[0].url, undefined); assert.deepEqual(packet.scope.selected_claim_ids, ['clm_fixture']);
});

test('rejects invalid archives, unverified claims, and forged or out-of-scope selections', async (t) => {
  const invalid = await archive(t, async (directory) => writeFile(path.join(directory, 'claims.jsonl'), '{bad}\n'));
  await assert.rejects(() => compileEvidencePacket(input(invalid)), /not valid/);
  const missingProvenance = await archive(t, async (directory) => { await confirmed(directory); const file = path.join(directory, 'claims.jsonl'); const claim = JSON.parse(await readFile(file, 'utf8')); claim.supporting_evidence[0].locator = ''; await writeFile(file, `${JSON.stringify(claim)}\n`); });
  await assert.rejects(() => compileEvidencePacket(input(missingProvenance)), /not valid/);
  const unverified = await archive(t); await assert.rejects(() => compileEvidencePacket(input(unverified)), /no confirming verification/);
  const valid = await archive(t, confirmed); await assert.rejects(() => compileEvidencePacket({ ...input(valid), claim_ids: ['clm_forged'] }), /not a retained/);
  const packet = await compileEvidencePacket(input(valid)); packet.scope.selected_claim_ids = ['clm_forged']; assert.equal(validateEvidencePacket(packet).valid, false); packet.scope.selected_claim_ids = ['clm_fixture']; packet.sources = []; assert.equal(validateEvidencePacket(packet).valid, false);
});

test('carries relevant conflicts and unresolved gaps as evidence without creating intent', async (t) => {
  const directory = await archive(t, async (root) => { await confirmed(root); await writeFile(path.join(root, 'conflicts.json'), JSON.stringify([{ conflict_id: 'conf_fixture', claim_ids: ['clm_fixture'], supporting_source_ids: ['src_fixture'], reason: 'Fixture limitation.', practical_implication: 'Keep the scope narrow.', status: 'unresolved' }])); await writeFile(path.join(root, 'coverage-gaps.json'), JSON.stringify([{ coverage_gap_id: 'gap_fixture', description: 'No second fixture source.', severity: 'high', status: 'open', related_subquestion_ids: ['sq_fixture'], related_claim_ids: ['clm_fixture'] }])); const manifestFile = path.join(root, 'manifest.json'); const manifest = JSON.parse(await readFile(manifestFile, 'utf8')); manifest.counts.conflicts = 1; manifest.counts.coverage_gaps = 1; await writeFile(manifestFile, `${JSON.stringify(manifest)}\n`); });
  const packet = await compileEvidencePacket(input(directory)); assert.equal(packet.conflicts[0].status, 'unresolved'); assert.equal(packet.coverage_gaps[0].status, 'open'); assert.equal('decision' in packet, false);
});
