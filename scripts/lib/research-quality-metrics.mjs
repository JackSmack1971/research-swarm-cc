import { createHash } from 'node:crypto';

export const DIMENSIONS = Object.freeze(['coverage', 'citation_support', 'conflict_disclosure', 'calibration', 'usefulness', 'defects', 'cost', 'verbosity']);
export const POST_RETRIEVAL = new Set(['synthesis', 'citation', 'calibration', 'adjudication', 'report_structure']);
export const RETRIEVAL_AFFECTING = new Set(['planning', 'search', 'source_selection', 'worker_behavior']);
export const RUNTIME_OR_FRICTION = new Set(['permissions', 'resource_limits', 'serialization']);
const quality = new Set(DIMENSIONS.slice(0, 5));
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const number = (value, name) => { if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a non-negative number.`); return value; };

export function classifyPolicyChanges(changes = []) {
  if (!Array.isArray(changes) || !changes.length) throw new Error('candidate change_categories must name at least one policy change.');
  const unknown = changes.filter((change) => !POST_RETRIEVAL.has(change) && !RETRIEVAL_AFFECTING.has(change) && !RUNTIME_OR_FRICTION.has(change));
  if (unknown.length) throw new Error(`Unknown policy change categories: ${unknown.join(', ')}.`);
  return { post_retrieval: changes.filter((change) => POST_RETRIEVAL.has(change)), retrieval_affecting: changes.filter((change) => RETRIEVAL_AFFECTING.has(change)), runtime_or_friction: changes.filter((change) => RUNTIME_OR_FRICTION.has(change)) };
}

export function normalizeMetrics(metrics, label = 'metrics') {
  if (!metrics || typeof metrics !== 'object') throw new Error(`${label} is required.`);
  const result = {};
  for (const dimension of DIMENSIONS) result[dimension] = number(metrics[dimension], `${label}.${dimension}`);
  for (const dimension of quality) if (result[dimension] > 1) throw new Error(`${label}.${dimension} must be between 0 and 1.`);
  return result;
}

export function compareMetrics(baseline, candidate) {
  const left = normalizeMetrics(baseline, 'baseline'); const right = normalizeMetrics(candidate, 'candidate');
  const deltas = Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, right[dimension] - left[dimension]]));
  const hard_gate_regressions = ['coverage', 'citation_support', 'conflict_disclosure', 'calibration'].filter((dimension) => deltas[dimension] < 0);
  if (deltas.defects > 0) hard_gate_regressions.push('defects');
  return { baseline: left, candidate: right, deltas, hard_gate_regressions, provenance_regressed: deltas.citation_support < 0, unsupported_material_claims: Math.max(0, Math.round(right.defects - left.defects)) };
}

export function blindedOrder(records) {
  return [...records].sort((left, right) => hash({ run_id: left.run_id, evaluator_id: left.evaluator_id }).localeCompare(hash({ run_id: right.run_id, evaluator_id: right.evaluator_id })) || left.run_id.localeCompare(right.run_id) || left.evaluator_id.localeCompare(right.evaluator_id));
}
