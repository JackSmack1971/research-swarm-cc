import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { routeKnowledgeNeed, validateEvidenceRoute, validateKnowledgeNeed } from '../scripts/lib/adaptive-evidence-router.mjs';

const root = path.join(process.cwd(), 'tests', 'fixtures', 'evidence-router');
const fixture = async (name) => JSON.parse(await readFile(path.join(root, `${name}.json`), 'utf8'));

test('selects the smallest sufficient evidence tier', async () => {
  assert.equal(routeKnowledgeNeed(await fixture('repository'), { repository_answerable: true }).tier, 'T0');
  assert.equal(routeKnowledgeNeed(await fixture('simple-external')).tier, 'T1');
  assert.equal(routeKnowledgeNeed(await fixture('simple-external'), { external_lookup: false }).tier, 'T2');
  assert.equal(routeKnowledgeNeed(await fixture('simple-external'), { independence_required: true }).tier, 'T3');
});

test('escalates risky, conflicting, and broad needs to the full swarm', async () => {
  assert.equal(routeKnowledgeNeed(await fixture('high-risk')).tier, 'T4');
  assert.equal(routeKnowledgeNeed(await fixture('simple-external'), { evidence_conflict: true }).tier, 'T4');
  assert.equal(routeKnowledgeNeed(await fixture('broad')).tier, 'T4');
});

test('validates canonical records and fails closed when underspecified', async () => {
  const need = await fixture('simple-external');
  const underspecified = await fixture('underspecified');
  assert.equal(validateKnowledgeNeed(need).valid, true);
  const route = routeKnowledgeNeed(need);
  assert.equal(validateEvidenceRoute(route).valid, true);
  assert.throws(() => routeKnowledgeNeed(underspecified), /Invalid knowledge need/);
  assert.throws(() => routeKnowledgeNeed({ ...need, question: '' }), /Invalid knowledge need/);
});

test('keeps evidence routing separate from intent and delivery', async () => {
  const route = routeKnowledgeNeed(await fixture('simple-external'));
  assert.equal('decision_id' in route, false);
  assert.equal('requirement' in route, false);
  assert.equal('authorization' in route, false);
});
