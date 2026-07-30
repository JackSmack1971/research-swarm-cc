import assert from 'node:assert/strict';
import test from 'node:test';
import { capClaims, chunk, escalationDecision, limitsFor, mergeVerificationPolicy, rankClaims } from '../scripts/lib/research-controls.mjs';
import { readFile } from 'node:fs/promises';

const claim = (claim_id, materiality = 'medium', confidence = 'medium') => ({ claim_id, materiality, confidence, statement: claim_id, supporting_evidence: [{ source_id: 'src_one' }] });

test('limits use depth defaults and reject malformed, fractional, negative, infinite, and huge values', () => {
  assert.equal(limitsFor('light').maxCanonicalClaims, 8);
  assert.equal(limitsFor('standard').maxCanonicalClaims, 20);
  assert.equal(limitsFor('deep').maxCanonicalClaims, 40);
  const limits = limitsFor('light', { maxWorkers: -1, maxClaimsPerWorker: 1.5, maxSourcesPerWorker: Infinity, maxCanonicalClaims: 999 });
  assert.equal(limits.maxWorkers, 2);
  assert.equal(limits.maxClaimsPerWorker, 5);
  assert.equal(limits.maxSourcesPerWorker, 4);
  assert.equal(limits.maxCanonicalClaims, 40);
});

test('claim ranking is risk-first and stable by claim ID, including all-critical overflow', () => {
  const ranked = rankClaims([claim('clm_b', 'critical', 'medium'), claim('clm_a', 'critical', 'medium'), claim('clm_c', 'high', 'low')]);
  assert.deepEqual(ranked.map(({ claim_id }) => claim_id), ['clm_a', 'clm_b', 'clm_c']);
  assert.deepEqual(capClaims(ranked, 2).omitted.map(({ claim_id }) => claim_id), ['clm_c']);
});

test('policy merging preserves user protections and only Deep overrides explicit none', () => {
  assert.equal(mergeVerificationPolicy('none', 'none', 'standard').policy, 'none');
  assert.equal(mergeVerificationPolicy('all-material', 'none', 'light').policy, 'all-material');
  assert.equal(mergeVerificationPolicy('risk-based', 'all-material', 'standard').policy, 'all-material');
  assert.equal(mergeVerificationPolicy('none', 'none', 'deep').policy, 'all-material');
});

test('verifier chunks never exceed the configured concurrency', () => {
  assert.deepEqual(chunk(['a', 'b', 'c', 'd', 'e'], 2), [['a', 'b'], ['c', 'd'], ['e']]);
});

test('post-normalization escalation is bounded and detects high-risk evidence gaps', () => {
  const result = escalationDecision({ depth: 'light', claims: [claim('clm_a', 'high', 'low')], conflicts: [], coverageGaps: [{ severity: 'high', status: 'open' }], sources: [{ source_id: 'src_one', source_type: 'secondary_analysis' }], query: 'medical safety question' });
  assert.equal(result.escalate, true);
  assert.equal(result.depth, 'standard');
  assert.equal(result.policy, 'all-material');
  assert.equal(escalationDecision({ depth: 'deep', claims: [], conflicts: [], coverageGaps: [], sources: [] }).escalate, false);
});

test('workflow uses one shared repair budget and a sanitized stage diagnostic', async () => {
  const workflow = await readFile('.claude/workflows/research-swarm.js', 'utf8');
  assert.match(workflow, /Coverage gaps:\\n\$\{JSON\.stringify\(boundedNormalized\.coverage_gaps\)\}/);
  assert.match(workflow, /while \(semanticValidation\.status === "fail" && repairRounds < 2\)/);
  assert.match(workflow, /const REPAIR_ACTIONS =/);
  for (const action of ['report_repair', 'ledger_repair', 'verification_repair', 'structural_repair']) assert.match(workflow, new RegExp(action));
  assert.match(workflow, /failure: \{ stage, code: FAILURE_CODES\[stage\] \?\? "WORKFLOW_FAILED", archive_exists: "unknown" \}/);
  assert.doesNotMatch(workflow.slice(workflow.lastIndexOf('} catch')), /cause\.message|cause\.stack/);
});
