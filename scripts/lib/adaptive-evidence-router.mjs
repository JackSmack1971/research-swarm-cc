import Ajv2020 from 'ajv/dist/2020.js';
import knowledgeNeedSchema from '../../engineering/schemas/knowledge-need.schema.json' with { type: 'json' };
import evidenceRouteSchema from '../../engineering/schemas/evidence-route.schema.json' with { type: 'json' };

const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addFormat('date-time', { type: 'string', validate: (value) => !Number.isNaN(Date.parse(value)) });
const validateNeedRecord = ajv.compile(knowledgeNeedSchema);
const validateRouteRecord = ajv.compile(evidenceRouteSchema);
const checked = (validate, value, label) => validate(value) ? { valid: true, errors: [] } : { valid: false, errors: validate.errors };

export function validateKnowledgeNeed(need) { return checked(validateNeedRecord, need, 'knowledge need'); }
export function validateEvidenceRoute(route) { return checked(validateRouteRecord, route, 'evidence route'); }

function factors(need, signals) {
  const external = signals.external_lookup ?? !signals.repository_answerable;
  return {
    repository_answerable: signals.repository_answerable ?? false,
    time_sensitive: need.freshness.requirement !== 'none',
    security_or_high_consequence: signals.security_or_high_consequence ?? (need.security === 'high' || need.consequence === 'high' || need.consequence === 'critical' || need.materiality === 'critical'),
    evidence_conflict: signals.evidence_conflict ?? false,
    independence_required: signals.independence_required ?? (need.authority.level === 'independent' || need.authority.proof === 'independent_corroboration'),
    breadth: need.scope.breadth,
    external_lookup: external,
    cost_budget: need.budget.cost,
    context_budget: need.budget.context
  };
}

export function routeKnowledgeNeed(need, signals = {}) {
  const validNeed = validateKnowledgeNeed(need);
  if (!validNeed.valid) throw new Error(`Invalid knowledge need: ${JSON.stringify(validNeed.errors)}`);
  const f = factors(need, signals);
  let tier = 'T0';
  if (!f.repository_answerable) {
    if (f.security_or_high_consequence || f.evidence_conflict || f.breadth === 'broad') tier = 'T4';
    else if (f.independence_required) tier = 'T3';
    else if (f.external_lookup && (need.authority.level === 'official' || need.authority.level === 'primary' || f.time_sensitive)) tier = 'T1';
    else tier = 'T2';
  }
  const intent = { T0: 'none', T1: 'authoritative_lookup', T2: 'focused_research', T3: 'independent_verification', T4: 'full_swarm' }[tier];
  const rationale = { T0: 'Repository intelligence is sufficient for this scoped need.', T1: 'A deterministic authoritative external lookup is sufficient for this current or authority-bound fact.', T2: 'The need is narrow enough for one focused external researcher.', T3: 'The required proof level needs focused research plus independent verification.', T4: 'Risk, conflict, or breadth warrants the full Research Swarm.' }[tier];
  const route = { schema_version: '1.0.0', route_id: `ert_${need.knowledge_need_id.slice(3)}`, knowledge_need_id: need.knowledge_need_id, tier, rationale, factors: f, escalation_intent: intent };
  const validRoute = validateEvidenceRoute(route);
  if (!validRoute.valid) throw new Error(`Generated invalid evidence route: ${JSON.stringify(validRoute.errors)}`);
  return route;
}

export const routeEvidence = routeKnowledgeNeed;

export async function routeKnowledgeNeedWithRepositoryEvidence(need, targetPath, options = {}) {
  const { inspectRepositoryKnowledge } = await import('./repository-intelligence.mjs');
  const evidence = await inspectRepositoryKnowledge(need, targetPath, options);
  return { evidence, route: routeKnowledgeNeed(need, { repository_answerable: !evidence.external_evidence_necessary }) };
}
