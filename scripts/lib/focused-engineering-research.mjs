import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../../engineering/schemas/focused-research-evidence.schema.json' with { type: 'json' };
import { validateKnowledgeNeed, routeKnowledgeNeed } from './adaptive-evidence-router.mjs';

const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addFormat('date-time', { type: 'string', validate: value => !Number.isNaN(Date.parse(value)) });
const validate = ajv.compile(schema);
const limits = { minimal: [3, 3, 6], bounded: [5, 5, 10], generous: [8, 8, 16] };
const result = (valid, errors = []) => ({ valid, errors });

export function validateFocusedResearchEvidence(value) { return validate(value) ? result(true) : result(false, validate.errors); }

export function projectFocusedResearchInput(need, { repositoryEvidence, authoritativeEvidence } = {}) {
  if (!validateKnowledgeNeed(need).valid) throw new Error('Invalid knowledge need.');
  const route = routeKnowledgeNeed(need, { repository_answerable: false, focused_research: true });
  if (route.tier !== 'T2') throw new Error(`Focused researcher requires T2 route; received ${route.tier}.`);
  return Object.freeze({ schema_version: '1.0.0', knowledge_need: Object.freeze({ knowledge_need_id: need.knowledge_need_id, question: need.question, scope: Object.freeze({ repository: need.scope.repository, dependencies: [...need.scope.dependencies], versions: [...need.scope.versions], usage: need.scope.usage }), freshness: Object.freeze({ ...need.freshness }), materiality: need.materiality, authority: Object.freeze({ ...need.authority }), stop_conditions: [...need.stop_conditions], escalation_conditions: [...need.escalation_conditions] }), prior_facts: Object.freeze({ repository: Object.freeze({ observed_facts: [...(repositoryEvidence?.observed_facts ?? [])], unresolved_subquestions: [...(repositoryEvidence?.unresolved_subquestions ?? [])] }), authoritative: Object.freeze({ result: authoritativeEvidence?.result ?? null, provenance: authoritativeEvidence?.provenance ?? null, unresolved_gaps: [...(authoritativeEvidence?.unresolved_gaps ?? [])] }) }), limits: Object.freeze({ max_external_researchers: 1, ...Object.fromEntries(['max_sources', 'max_claims', 'max_web_fetches'].map((key, i) => [key, limits[need.budget.context][i]])) }) });
}

export function acceptFocusedResearchEvidence(input, evidence) {
  const errors = [];
  if (!input?.knowledge_need?.knowledge_need_id || evidence?.knowledge_need_id !== input.knowledge_need.knowledge_need_id) errors.push('knowledge_need_id mismatch.');
  const valid = validateFocusedResearchEvidence(evidence);
  if (!valid.valid) errors.push(...valid.errors.map(error => `${error.instancePath || '/'} ${error.message}`));
  const [maxSources, maxClaims, maxFetches] = [input.limits.max_sources, input.limits.max_claims, input.limits.max_web_fetches];
  if (evidence?.sources?.length > maxSources || evidence?.claims?.length > maxClaims || evidence?.budget?.used_web_fetches > maxFetches) errors.push('Focused research budget exceeded.');
  if (evidence?.budget && (evidence.budget.max_sources !== maxSources || evidence.budget.max_claims !== maxClaims || evidence.budget.max_web_fetches !== maxFetches)) errors.push('Focused research budget does not match the input projection.');
  if (evidence?.budget && (evidence.budget.used_sources !== evidence.sources.length || evidence.budget.used_claims !== evidence.claims.length)) errors.push('Focused research usage counts must match returned records.');
  const sourceIds = new Set(evidence?.sources?.map(source => source.source_id));
  const claimIds = new Set(evidence?.claims?.map(claim => claim.claim_id));
  if (sourceIds.size !== (evidence?.sources?.length ?? 0) || claimIds.size !== (evidence?.claims?.length ?? 0)) errors.push('Focused research IDs must be unique.');
  for (const claim of evidence?.claims ?? []) for (const item of [...(claim.supporting_evidence ?? []), ...(claim.counter_evidence ?? [])]) if (!sourceIds.has(item.source_id)) errors.push(`Claim ${claim.claim_id} references unknown source ${item.source_id}.`);
  const reasons = [];
  if (!(evidence?.sources?.length && evidence?.claims?.length)) reasons.push('No sufficiently supported focused evidence was returned.');
  if (!(evidence?.sources ?? []).some(source => ['official_documentation', 'official_release', 'standard', 'vendor_advisory', 'primary_research', 'primary_data'].includes(source.source_type))) reasons.push('No official, standard, vendor, or primary source was returned.');
  if ((evidence?.claims ?? []).some(claim => claim.confidence === 'low')) reasons.push('At least one admitted claim has insufficient confidence.');
  if ((evidence?.claims ?? []).some(claim => claim.counter_evidence.length) || evidence?.unresolved_gaps?.length) reasons.push('Material counter-evidence or unresolved gaps remain.');
  if (reasons.length && !evidence?.escalation?.required) errors.push('Insufficient evidence must recommend escalation.');
  if (reasons.length && evidence?.escalation?.tier === 'none') errors.push('Insufficient evidence must escalate to T3 or T4.');
  if (evidence?.escalation?.required && evidence.escalation.tier === 'none') errors.push('Escalation requires T3 or T4.');
  return errors.length ? result(false, errors) : result(true);
}

export async function runFocusedResearch(input, retrieve) {
  if (typeof retrieve !== 'function') throw new Error('Focused research requires a Claude Code-native researcher callback.');
  const evidence = await retrieve(input);
  const checked = acceptFocusedResearchEvidence(input, evidence);
  if (!checked.valid) throw new Error(`Invalid focused research evidence: ${JSON.stringify(checked.errors)}`);
  return evidence;
}
