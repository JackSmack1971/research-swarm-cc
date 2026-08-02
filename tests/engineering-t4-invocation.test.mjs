import assert from 'node:assert/strict';
import test from 'node:test';
import need from './fixtures/evidence-router/high-risk.json' with { type: 'json' };
import { createEngineeringT4Invocation, validateEngineeringT4Invocation } from '../scripts/lib/engineering-t4-invocation.mjs';

test('T4 invocation is bounded, deep, and reuses prior scoped evidence', () => {
  const invocation = createEngineeringT4Invocation({ need, repositoryEvidence: ['declared auth boundary'], authoritativeEvidence: ['official requirement'], materialUnknowns: ['reachability'], budgets: { max_sources: 7, max_claims: 9, max_workers: 2 } });
  assert.equal(validateEngineeringT4Invocation(invocation).valid, true);
  assert.equal(invocation.route.tier, 'T4');
  assert.equal(invocation.depth, 'deep');
  assert.equal(invocation.verification, 'all-material');
  assert.deepEqual(invocation.prior_evidence.authoritative, ['official requirement']);
  assert.deepEqual(invocation.budgets, { max_sources: 7, max_claims: 9, max_workers: 2 });
  assert.deepEqual(invocation.projection_telemetry, { known_repository_items: 1, known_authoritative_items: 1, material_unknown_items: 1, redundant_research_avoided_items: 2, live_runtime: false });
  assert.doesNotMatch(JSON.stringify(invocation), /Do not research/);
});

test('non-T4 needs cannot enter the T4 invocation path', () => {
  assert.throws(() => createEngineeringT4Invocation({ need: { ...need, consequence: 'low', security: 'none', materiality: 'low', authority: { level: 'official', proof: 'citation' }, budget: { ...need.budget, max_external_researchers: 1 } } }), /requires a T4 route/);
});
