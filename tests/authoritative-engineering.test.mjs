import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { inspectRepositoryKnowledge } from '../scripts/lib/repository-intelligence.mjs';
import { createAuthoritativeLookupRequest, lookupAuthoritative, validateAuthoritativeEvidence } from '../scripts/lib/authoritative-engineering.mjs';

const need = JSON.parse(await readFile(path.join('tests', 'fixtures', 'evidence-router', 'simple-external.json')));
need.scope.dependencies = ['ajv']; need.scope.versions = ['8.20.0'];
const repositoryEvidence = await inspectRepositoryKnowledge(need, process.cwd(), { dependency: 'ajv', now: () => '2026-08-02T00:00:00.000Z' });
const clock = () => '2026-08-02T00:00:00.000Z';
const response = async (name) => JSON.parse(await readFile(path.join('tests', 'fixtures', 'authoritative', `${name}.json`)));

test('T1 request is constrained by T0 package/version metadata', () => {
  const request = createAuthoritativeLookupRequest({ need, repositoryEvidence, lookupKind: 'version', now: clock });
  assert.equal(request.package, 'ajv'); assert.equal(request.repository_version, '8.20.0'); assert.deepEqual(request.allowed_sources, ['official-registry', 'official-release']);
  assert.throws(() => createAuthoritativeLookupRequest({ need: { ...need, scope: { ...need.scope, dependencies: ['other'] } }, repositoryEvidence, lookupKind: 'version', now: clock }), /outside/);
});

test('T1 normalizes official version and release metadata', async () => {
  const evidence = await lookupAuthoritative({ need, repositoryEvidence, lookupKind: 'release', now: clock, retrieve: async () => response('release') });
  assert.equal(evidence.result.records[0].version, '8.20.0'); assert.equal(evidence.escalation.required, false); assert.equal(validateAuthoritativeEvidence(evidence).valid, true);
});

test('CVE/advisory matching preserves affected-version evidence and does not claim exploitability', async () => {
  const evidence = await lookupAuthoritative({ need, repositoryEvidence, lookupKind: 'advisory', now: clock, retrieve: async () => response('advisory') });
  assert.deepEqual(evidence.security.affected_version_evidence[0].affected_versions, ['<8.21.0']); assert.equal(evidence.security.affected_version_evidence[0].matches_repository_version, true); assert.equal(evidence.security.exploitability, 'not_assessed'); assert.equal(evidence.escalation.required, false);
});

test('unavailable or conflicting T1 data escalates', async () => {
  const evidence = await lookupAuthoritative({ need, repositoryEvidence, lookupKind: 'version', now: clock, retrieve: async () => response('unavailable') });
  assert.equal(evidence.escalation.required, true); assert.equal(evidence.escalation.tier, 'T2');
});
