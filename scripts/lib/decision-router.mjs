import Ajv2020 from 'ajv/dist/2020.js';
import uncertaintySchema from '../../engineering/schemas/uncertainty.schema.json' with { type: 'json' };
import decisionSchema from '../../engineering/schemas/decision.schema.json' with { type: 'json' };
import routeSchema from '../../engineering/schemas/decision-route.schema.json' with { type: 'json' };

const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addFormat('date-time', { type: 'string', validate: (value) => !Number.isNaN(Date.parse(value)) });
const validateUncertaintyRecord = ajv.compile(uncertaintySchema);
const validateDecisionRecord = ajv.compile(decisionSchema);
const validateRouteRecord = ajv.compile(routeSchema);

function validation(validate, value) { return validate(value) ? { valid: true, errors: [] } : { valid: false, errors: validate.errors }; }
export function validateUncertainty(uncertainty) { return validation(validateUncertaintyRecord, uncertainty); }
export function validateDecision(decision) { return validation(validateDecisionRecord, decision); }
export function validateDecisionRoute(route) { return validation(validateRouteRecord, route); }

const ROUTES = {
  detail: 'no_inquiry', repository_fact: 'repository_inspection', external_fact: 'research_evidence', experiential: 'prototype',
  normative: 'human', preference: 'human', policy: 'human', implementation: 'agent_choice'
};

function rationale(uncertainty, route) {
  if (route === 'no_inquiry') return 'The detail is already resolved or reversible enough to proceed without more inquiry.';
  if (route === 'repository_inspection') return 'A trustworthy repository inspection can answer this codebase fact.';
  if (route === 'research_evidence') return 'Material external factual uncertainty requires the Research Swarm and, when relevant, a scoped evidence packet.';
  if (route === 'prototype') return 'Inspection cannot settle this experiential, UX, state, or architecture question; use a disposable prototype.';
  if (route === 'human') return 'This is a normative, preference, policy, high-irreversibility, or consequential decision that requires human judgment.';
  return 'This is a reversible, low-risk implementation choice the agent may make and record.';
}

export function routeUncertainty(uncertainty) {
  const checked = validateUncertainty(uncertainty);
  if (!checked.valid) throw new Error(`Invalid uncertainty: ${JSON.stringify(checked.errors)}`);
  let route = uncertainty.status === 'resolved' ? 'no_inquiry' : ROUTES[uncertainty.kind];
  if (route === 'agent_choice' && (uncertainty.reversibility === 'hard' || uncertainty.consequential)) route = 'human';
  const result = { schema_version: '1.0.0', route_id: `rte_${uncertainty.uncertainty_id.slice(4)}`, uncertainty_id: uncertainty.uncertainty_id, route, rationale: rationale(uncertainty, route) };
  if (route === 'human') result.human_question = uncertainty.question;
  const valid = validateDecisionRoute(result);
  if (!valid.valid) throw new Error(`Generated invalid route: ${JSON.stringify(valid.errors)}`);
  return result;
}
