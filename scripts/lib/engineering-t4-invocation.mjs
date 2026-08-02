import { validateKnowledgeNeed, routeKnowledgeNeed } from './adaptive-evidence-router.mjs';

const integer = (value, fallback, maximum) => Number.isInteger(value) && value > 0 ? Math.min(value, maximum) : fallback;
const compact = value => Array.isArray(value) ? value.filter(Boolean).slice(0, 96) : [];

export function createEngineeringT4Invocation({ need, repositoryEvidence = [], authoritativeEvidence = [], materialUnknowns = [], budgets = {}, signals = {} }) {
  const checked = validateKnowledgeNeed(need);
  if (!checked.valid) throw new Error(`Invalid knowledge need: ${JSON.stringify(checked.errors)}`);
  const route = routeKnowledgeNeed(need, { repository_answerable: false, external_lookup: true, ...signals });
  if (route.tier !== 'T4') throw new Error(`Engineering T4 requires a T4 route; received ${route.tier}.`);
  const maxSources = integer(budgets.max_sources ?? need.budget.max_sources, 12, 96);
  const maxClaims = integer(budgets.max_claims ?? need.budget.max_claims, 20, 40);
  const maxWorkers = integer(budgets.max_workers ?? need.budget.max_external_researchers, 4, 8);
  const priorEvidence = { repository: compact(repositoryEvidence), authoritative: compact(authoritativeEvidence) };
  return {
    mode: 'engineering-t4',
    query: need.question,
    depth: 'deep',
    verification: 'all-material',
    learning: 'off',
    knowledge_need: need,
    prior_evidence: priorEvidence,
    material_unknowns: compact(materialUnknowns),
    budgets: { max_sources: maxSources, max_claims: maxClaims, max_workers: maxWorkers },
    route,
    projection_telemetry: { known_repository_items: priorEvidence.repository.length, known_authoritative_items: priorEvidence.authoritative.length, material_unknown_items: compact(materialUnknowns).length, redundant_research_avoided_items: priorEvidence.repository.length + priorEvidence.authoritative.length, live_runtime: false },
    limits: { maxSourcesPerWorker: Math.min(maxSources, 12), maxClaimsPerWorker: Math.min(maxClaims, 15), maxCanonicalClaims: maxClaims, maxWorkers }
  };
}

export function validateEngineeringT4Invocation(invocation) {
  const errors = [];
  if (invocation?.mode !== 'engineering-t4') errors.push('mode must be engineering-t4.');
  if (!invocation?.knowledge_need?.knowledge_need_id) errors.push('knowledge_need is required.');
  if (invocation?.route?.tier !== 'T4') errors.push('route must select T4.');
  if (!Number.isInteger(invocation?.budgets?.max_sources) || !Number.isInteger(invocation?.budgets?.max_claims)) errors.push('hard source and claim budgets are required.');
  return { valid: errors.length === 0, errors };
}
