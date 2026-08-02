import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { compileT1EngineeringEvidenceCapsule, compileT2EngineeringEvidenceCapsule, compileT3EngineeringEvidenceCapsule, compileT4EngineeringEvidenceCapsule, validateCapsuleIdentity, validateEngineeringEvidenceCapsule } from '../scripts/lib/engineering-evidence-capsule.mjs';
import need from './fixtures/evidence-router/simple-external.json' with { type: 'json' };
import t1 from './fixtures/authoritative/release.json' with { type: 'json' };
import t2 from './fixtures/focused-verification/dispositions.json' with { type: 'json' };

const clock = '2026-08-02T00:00:00.000Z';
const t1Evidence = { schema_version: '1.0.0', evidence_id: 'aev_capsule', knowledge_need_id: need.knowledge_need_id, lookup_kind: 'release', scope: { ecosystem: 'npm', package: 'ajv', repository_version: '8.20.0', requested_version: '8.20.0' }, provenance: { authority: 'official', source_kind: 'official-release', locator: 'https://vendor.test/release', retrieved_at: clock, freshness: 'current' }, result: { status: t1.status, records: t1.records }, conflicts: [], unresolved_gaps: [], escalation: { required: false, tier: 'none', reasons: [] }, non_authorizing: true };
const source = { source_id: 'frs_docs', title: 'Release notes', publisher: 'Vendor', publication_date: '2026-01-01T00:00:00.000Z', publication_unavailable_reason: null, locator: 'https://vendor.test/release#8.20.0', source_type: 'official_release', accessed_at: clock, independence_group: 'vendor', version_applicability: '8.20.0' };
const t2Evidence = { schema_version: '1.0.0', evidence_id: 'fre_capsule', knowledge_need_id: need.knowledge_need_id, scope: { question: need.question, repository: need.scope.repository, dependencies: need.scope.dependencies, versions: need.scope.versions, usage: need.scope.usage }, sources: [source], claims: [{ claim_id: 'frc_release', statement: 'Version 8.20.0 was released on the stated date.', scope: 'The requested release.', claim_type: 'source_assertion', confidence: 'medium', confidence_rationale: 'Official release record.', supporting_evidence: [{ source_id: source.source_id, locator: 'Release table' }], counter_evidence: [] }], unresolved_gaps: [], escalation: { required: false, tier: 'none', reasons: [] }, budget: { max_sources: 5, max_claims: 5, max_web_fetches: 10, used_sources: 1, used_claims: 1, used_web_fetches: 1 }, non_authorizing: true };

test('T1, T2, and T3 compile to the same capsule contract', () => {
  const t1Capsule = compileT1EngineeringEvidenceCapsule({ need, evidence: t1Evidence });
  const t2Capsule = compileT2EngineeringEvidenceCapsule({ need, evidence: t2Evidence });
  const t3Evidence = { ...t2[0], knowledge_need_id: need.knowledge_need_id, claims: [{ ...t2[0].claims[0], claim_id: 'frc_release', checked_source_ids: ['frs_docs'], rationale: 'Confirmed.' }] };
  const t3Capsule = compileT3EngineeringEvidenceCapsule({ need, researchEvidence: t2Evidence, verificationEvidence: t3Evidence });
  for (const capsule of [t1Capsule, t2Capsule, t3Capsule]) { assert.equal(validateEngineeringEvidenceCapsule(capsule).valid, true); assert.equal(validateCapsuleIdentity(capsule).valid, true); assert.equal(capsule.non_authorizing, true); assert.equal(capsule.applicability.repository, need.scope.repository); }
  assert.equal(t1Capsule.producer.tier, 'T1'); assert.equal(t2Capsule.producer.tier, 'T2'); assert.equal(t3Capsule.producer.tier, 'T3');
});

test('T1 fails closed for unavailable evidence and capsules reject forged references', () => {
  assert.throws(() => compileT1EngineeringEvidenceCapsule({ need, evidence: { ...t1Evidence, result: { status: 'unavailable', records: [] }, provenance: { ...t1Evidence.provenance, freshness: 'unknown' }, escalation: { required: true, tier: 'T2', reasons: ['unavailable'] } } }), /unavailable/);
  const capsule = compileT2EngineeringEvidenceCapsule({ need, evidence: t2Evidence }); capsule.claims[0].evidence[0].source_id = 'forged'; assert.equal(validateEngineeringEvidenceCapsule(capsule).valid, false);
});

test('T4 projects the validated archive and preserves archive lineage', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'evidence-capsule-')); t.after(() => rm(directory, { recursive: true, force: true })); await cp('tests/fixtures/valid-run-v2', directory, { recursive: true });
  const manifestPath = path.join(directory, 'manifest.json'); const manifest = JSON.parse(await readFile(manifestPath, 'utf8')); manifest.run_directory = directory; await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
  const eventsPath = path.join(directory, 'verification-events.jsonl'); const event = JSON.parse(await readFile(eventsPath, 'utf8')); event.outcome = 'confirmed'; event.rationale = 'Independent confirmation.'; await writeFile(eventsPath, `${JSON.stringify(event)}\n`);
  const capsule = await compileT4EngineeringEvidenceCapsule({ archiveDirectory: directory, need, claim_ids: ['clm_fixture'] }); assert.equal(capsule.producer.tier, 'T4'); assert.equal(capsule.identity.lineage.run_id, 'run_fixture'); assert.equal(capsule.identity.lineage.archive_sha256.length, 64); assert.equal(validateCapsuleIdentity(capsule).valid, true);
});
