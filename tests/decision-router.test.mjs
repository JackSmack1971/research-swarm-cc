import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { routeUncertainty, validateDecision, validateDecisionRoute, validateUncertainty } from '../scripts/lib/decision-router.mjs';

const fixtures = path.join(process.cwd(), 'tests', 'fixtures', 'decision-router');
const fixture = async (name) => JSON.parse(await readFile(path.join(fixtures, `${name}.json`), 'utf8'));

test('routes each uncertainty class deterministically without escalating factual questions to a human', async () => {
  const expected = { 'repository-fact': 'repository_inspection', 'external-fact': 'research_evidence', experiential: 'prototype', normative: 'human', implementation: 'agent_choice', 'resolved-detail': 'no_inquiry' };
  for (const [name, route] of Object.entries(expected)) {
    const uncertainty = await fixture(name); assert.equal(validateUncertainty(uncertainty).valid, true);
    const result = routeUncertainty(uncertainty); assert.equal(result.route, route); assert.equal(validateDecisionRoute(result).valid, true);
    assert.equal('human_question' in result, route === 'human');
  }
  for (const name of ['repository-fact', 'external-fact']) assert.notEqual(routeUncertainty(await fixture(name)).route, 'human');
});

test('uses the human route for consequential or hard-to-reverse implementation choices and permits only one question', async () => {
  const result = routeUncertainty({ ...(await fixture('implementation')), uncertainty_id: 'unc_irreversible', reversibility: 'hard' });
  assert.equal(result.route, 'human'); assert.equal(result.human_question, 'Which existing helper should format this reversible internal label?');
  assert.equal(validateDecisionRoute({ ...result, human_question: ['one', 'two'] }).valid, false);
  assert.equal(validateDecisionRoute({ ...result, route: 'agent_choice' }).valid, false);
});

test('keeps evidence distinct from decisions and rejects malformed records', async () => {
  const decision = { schema_version: '1.0.0', decision_id: 'dec_fixture', scope: 'Fixture scope', outcome: 'Choose the documented option.', rationale: 'It satisfies the stated constraint.', alternatives: ['Use the alternative option.'], evidence_references: ['epk_fixture'], decided_by: { kind: 'human', identifier: 'product-owner' }, decided_at: '2026-08-01T00:00:00.000Z', reversibility: 'moderate' };
  assert.equal(validateDecision(decision).valid, true); assert.equal('requirement' in decision, false); assert.equal('authorization' in decision, false);
  assert.equal(validateDecision({ ...decision, decided_by: { kind: 'agent' } }).valid, false);
  assert.equal(validateUncertainty({ ...(await fixture('repository-fact')), kind: 'invented' }).valid, false);
});

test('statically validates the manually invoked bounded build controller', async () => {
  const skill = await readFile('.claude/skills/build/SKILL.md', 'utf8');
  assert.match(skill, /^---\nname: build\ndescription: .+\ndisable-model-invocation: true\n---/);
  assert.doesNotMatch(skill, /user-invocable: false/); assert.match(skill, /npm run execute/); assert.match(skill, /unverified implementation/i); assert.match(skill, /must not approve its own work/i); assert.match(skill, /commit or push/i);
});
