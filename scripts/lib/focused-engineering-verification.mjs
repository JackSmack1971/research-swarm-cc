import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../../engineering/schemas/focused-verification-evidence.schema.json' with { type: 'json' };
import { validateKnowledgeNeed, routeKnowledgeNeed } from './adaptive-evidence-router.mjs';
import { validateFocusedResearchEvidence } from './focused-engineering-research.mjs';

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validate = ajv.compile(schema);
const result = (valid, errors = []) => ({ valid, errors });
const freeze = (value) => Object.freeze(value);

export function validateFocusedVerificationEvidence(value) { return validate(value) ? result(true) : result(false, validate.errors); }

export function projectFocusedVerificationInput(need, focusedEvidence, { repositoryFacts = [] } = {}) {
  if (!validateKnowledgeNeed(need).valid) throw new Error('Invalid knowledge need.');
  if (!validateFocusedResearchEvidence(focusedEvidence).valid) throw new Error('Invalid focused research evidence.');
  const route = routeKnowledgeNeed(need, { focused_verification: true, source_group_insufficient: new Set(focusedEvidence.sources.map(({ independence_group }) => independence_group)).size <= 1 });
  if (route.tier !== 'T3') throw new Error(`Focused verifier requires T3 route; received ${route.tier}.`);
  const sourceIds = new Set(focusedEvidence.sources.map(({ source_id }) => source_id));
  return freeze({ schema_version: '1.0.0', knowledge_need: freeze({ knowledge_need_id: need.knowledge_need_id, question: need.question, scope: freeze({ ...need.scope }), freshness: freeze({ ...need.freshness }), materiality: need.materiality, consequence: need.consequence, security: need.security, authority: freeze({ ...need.authority }) }), admitted_claims: focusedEvidence.claims.map(({ claim_id, statement, scope, claim_type, confidence, supporting_evidence, counter_evidence }) => freeze({ claim_id, statement, scope, claim_type, confidence, supporting_evidence: supporting_evidence.map(({ source_id, locator }) => ({ source_id, locator })), counter_evidence: counter_evidence.map(({ source_id, locator }) => ({ source_id, locator })) })), source_metadata: focusedEvidence.sources.map(({ source_id, title, publisher, publication_date, locator, source_type, accessed_at, independence_group, version_applicability }) => ({ source_id, title, publisher, publication_date, locator, source_type, accessed_at, independence_group, version_applicability })), repository_facts: [...repositoryFacts], verification_posture: { seek_disconfirming_first: true, required_dispositions: ['confirmed', 'confirmed_with_qualification', 'contradicted', 'demoted', 'unverifiable'] }, source_ids: [...sourceIds] });
}

export function acceptFocusedVerificationEvidence(input, evidence, { researcherId = 'engineering-focused-researcher' } = {}) {
  const errors = [];
  const valid = validateFocusedVerificationEvidence(evidence);
  if (!valid.valid) errors.push(...valid.errors.map(error => `${error.instancePath || '/'} ${error.message}`));
  if (evidence?.knowledge_need_id !== input?.knowledge_need?.knowledge_need_id) errors.push('knowledge_need_id mismatch.');
  if (evidence?.verifier?.verifier_id === researcherId) errors.push('Researcher cannot self-approve evidence.');
  const claimIds = new Set(input?.admitted_claims?.map(({ claim_id }) => claim_id));
  const dispositionIds = new Set(evidence?.claims?.map(({ claim_id }) => claim_id));
  if (dispositionIds.size !== (evidence?.claims?.length ?? 0)) errors.push('Verification claim IDs must be unique.');
  if (dispositionIds.size !== claimIds.size || [...claimIds].some(id => !dispositionIds.has(id))) errors.push('Every admitted claim requires one terminal disposition.');
  for (const claim of evidence?.claims ?? []) if (!claimIds.has(claim.claim_id)) errors.push(`Unknown admitted claim ${claim.claim_id}.`); else if (claim.checked_source_ids.some(id => !input.source_ids.includes(id))) errors.push(`Claim ${claim.claim_id} references an unchecked source.`);
  for (const conflict of evidence?.conflicts ?? []) if (!claimIds.has(conflict.claim_id)) errors.push(`Conflict references unknown claim ${conflict.claim_id}.`);
  if (evidence?.escalation?.required && evidence.escalation.tier !== 'T4') errors.push('T3 escalation can only target T4.');
  return errors.length ? result(false, errors) : result(true);
}

export async function runFocusedVerification(input, verify, options = {}) {
  if (typeof verify !== 'function') throw new Error('Focused verification requires a Claude Code-native verifier callback.');
  const evidence = await verify(input);
  const checked = acceptFocusedVerificationEvidence(input, evidence, options);
  if (!checked.valid) throw new Error(`Invalid focused verification evidence: ${JSON.stringify(checked.errors)}`);
  return evidence;
}
