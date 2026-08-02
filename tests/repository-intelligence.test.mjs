import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { inspectRepositoryKnowledge, validateRepositoryEvidence } from '../scripts/lib/repository-intelligence.mjs';
import { routeKnowledgeNeedWithRepositoryEvidence } from '../scripts/lib/adaptive-evidence-router.mjs';
import { readFile } from 'node:fs/promises';

const fixture = path.join(process.cwd(), 'tests', 'fixtures', 'evidence-router', 'repository.json');
const need = JSON.parse(await readFile(fixture, 'utf8'));
const profiledFixture = path.join(process.cwd(), 'tests', 'fixtures', 'project-profiler', 'node-web');

test('T0 reads exact files and stamps repository evidence', async () => {
  const evidence = await inspectRepositoryKnowledge(need, process.cwd(), { file: 'package.json', now: () => '2026-08-02T00:00:00.000Z' });
  assert.equal(evidence.mechanism, 'read'); assert.equal(evidence.non_authorizing, true); assert.match(evidence.source.source_fingerprint, /^[a-f0-9]{64}$/); assert.equal(validateRepositoryEvidence(evidence).valid, true);
});

test('T0 searches exact text before graph intelligence', async () => {
  const evidence = await inspectRepositoryKnowledge(need, process.cwd(), { text: '"type": "module"', now: () => '2026-08-02T00:00:00.000Z' });
  assert.equal(evidence.mechanism, 'search'); assert.ok(evidence.anchors.some(({ path: name }) => name === 'package.json')); assert.equal(evidence.external_evidence_necessary, false);
});

test('T0 parses dependency metadata and marks structural work as a non-authorizing candidate', async () => {
  const metadata = await inspectRepositoryKnowledge(need, process.cwd(), { dependency: 'ajv', now: () => '2026-08-02T00:00:00.000Z' });
  assert.equal(metadata.mechanism, 'metadata'); assert.match(metadata.observed_facts[0], /ajv/);
  const structural = await inspectRepositoryKnowledge(need, process.cwd(), { now: () => '2026-08-02T00:00:00.000Z' });
  assert.equal(structural.mechanism, 'graphify-candidate'); assert.equal(structural.non_authorizing, true); assert.equal(structural.external_evidence_necessary, false);
});

test('the integrated router consumes T0 before selecting escalation', async () => {
  const { evidence, route } = await routeKnowledgeNeedWithRepositoryEvidence(need, process.cwd(), { file: 'package.json', now: () => '2026-08-02T00:00:00.000Z' });
  assert.equal(evidence.mechanism, 'read'); assert.equal(route.tier, 'T0'); assert.equal(route.factors.repository_answerable, true);
});

test('T0 uses project LSP when the profile exposes it', async () => {
  const evidence = await inspectRepositoryKnowledge(need, profiledFixture, { symbol: 'App', lsp: async () => ({ anchors: [{ path: 'src/app.tsx', line: 1, kind: 'symbol' }], facts: ['App is exported from the fixture.'] }), now: () => '2026-08-02T00:00:00.000Z' });
  assert.equal(evidence.mechanism, 'lsp'); assert.equal(evidence.provenance_type, 'lsp_observation'); assert.deepEqual(evidence.anchors[0], { path: 'src/app.tsx', line: 1, kind: 'symbol' });
});
