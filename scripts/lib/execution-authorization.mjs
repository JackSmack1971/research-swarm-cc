import Ajv2020 from 'ajv/dist/2020.js';
import classificationSchema from '../../engineering/schemas/risk-classification.schema.json' with { type: 'json' };
import authorizationSchema from '../../engineering/schemas/execution-authorization.schema.json' with { type: 'json' };
import profileGateSchema from '../../engineering/schemas/production-risk-profile.schema.json' with { type: 'json' };
import profileSchema from '../../engineering/schemas/project-profile.schema.json' with { type: 'json' };
import taskGraphSchema from '../../engineering/schemas/task-graph.schema.json' with { type: 'json' };
import { detectChangeContractDrift, validateChangeContract } from './change-contract.mjs';
import { detectTaskGraphDrift, sha256, validateContextCapsule } from './task-graph.mjs';

const dimensions = ['security_authentication_authorization', 'privacy_sensitive_data', 'data_integrity', 'migrations', 'external_apis', 'financial_high_consequence', 'ui_accessibility', 'infrastructure_configuration', 'dependency_introduction', 'blast_radius', 'reversibility'];
const rank = { none: 0, low: 1, medium: 2, high: 3 };
const level = (values) => ['low', 'medium', 'high'][Math.max(0, ...values.map((item) => rank[item])) - 1] ?? 'low';
const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addFormat('date-time', { type: 'string', validate: (value) => !Number.isNaN(Date.parse(value)) });
ajv.addSchema(profileSchema); ajv.addSchema(taskGraphSchema); ajv.addSchema(classificationSchema); ajv.addSchema(profileGateSchema);
const validateClassification = ajv.compile(classificationSchema); const validateAuthorization = ajv.compile(authorizationSchema);
const defaultDimension = () => ({ level: 'none', rationale: 'No material change is recorded for this dimension.' });
const stable = (value) => JSON.stringify(value);
const profileDefinitions = [
  ['authentication_authorization_security', ['security_authentication_authorization'], ['least_privilege', 'negative_privilege_tests'], ['security_review'], ['security'], 'stop_and_restore'],
  ['sensitive_data_privacy_integrity', ['privacy_sensitive_data', 'data_integrity'], ['data_classification', 'integrity_invariants'], ['data_integrity_proof'], ['security'], 'stop_and_restore'],
  ['schema_data_migration', ['migrations'], ['compatibility', 'dry_run', 'rollback', 'partial_failure'], ['migration_proof'], ['command', 'runtime'], 'stop_and_roll_back'],
  ['external_api_integration', ['external_apis'], ['current_documentation', 'timeout_retry', 'idempotency', 'error_behavior'], ['external_api_proof'], ['api'], 'stop_and_revert'],
  ['ui_accessibility', ['ui_accessibility'], ['interaction_states', 'accessibility', 'error_state', 'loading_state'], ['accessibility_proof'], ['browser'], 'stop_and_revert'],
  ['infrastructure_deployment_configuration', ['infrastructure_configuration'], ['configuration_validation', 'deployment_plan', 'rollback'], ['infrastructure_proof'], ['command', 'runtime'], 'stop_and_roll_back'],
  ['dependency_supply_chain', ['dependency_introduction'], ['subtraction_ladder', 'maintenance_security_license'], ['dependency_review'], ['security'], 'stop_and_revert']
];
const profileGates = (classification) => profileDefinitions.flatMap(([profile_id, dimensions, planning_constraints, verification_categories, required_proof_kinds, failure_recovery]) => {
  const activation_evidence = dimensions.map((key) => classification.dimensions[key]).filter(({ level: value }) => value !== 'none').map(({ rationale }) => rationale);
  return activation_evidence.length ? [{ profile_id, activation_evidence: [...new Set(activation_evidence)].sort(), planning_constraints, verification_categories, required_proof_kinds, human_approval_boundaries: ['before_merge', 'before_deployment'], failure_recovery }] : [];
});

export function classifyRisk({ contract, graph, capsule, signals = {} }) {
  if (!validateChangeContract(contract).valid || contract.lifecycle_state !== 'accepted') throw new Error('Risk classification requires a valid accepted Change Contract.');
  if (!validateContextCapsule(capsule).valid || !graph.tasks.some(({ task_id }) => task_id === capsule.task_id)) throw new Error('Risk classification requires a valid task capsule in the current graph.');
  const values = Object.fromEntries(dimensions.map((key) => [key, defaultDimension()]));
  const set = (key, value, rationale) => { if (!rank[value]) return; if (rank[value] >= rank[values[key].level]) values[key] = { level: value, rationale }; };
  for (const risk of contract.risks) {
    if (risk.dimension === 'security') set('security_authentication_authorization', risk.level === 'critical' ? 'high' : risk.level, risk.rationale);
    if (risk.dimension === 'data') { set('privacy_sensitive_data', risk.level === 'critical' ? 'high' : risk.level, risk.rationale); set('data_integrity', risk.level === 'critical' ? 'high' : risk.level, risk.rationale); }
    if (risk.dimension === 'external_effect') { set('external_apis', risk.level === 'critical' ? 'high' : risk.level, risk.rationale); set('financial_high_consequence', risk.level === 'critical' ? 'high' : risk.level, risk.rationale); }
    if (risk.dimension === 'scope') set('blast_radius', risk.level === 'critical' ? 'high' : risk.level, risk.rationale);
    if (risk.dimension === 'reversibility') set('reversibility', risk.level === 'critical' ? 'high' : risk.level, risk.rationale);
  }
  for (const [key, input] of Object.entries(signals)) if (dimensions.includes(key) && input && rank[input.level] !== undefined) set(key, input.level, input.rationale);
  const result = { schema_version: '1.0.0', contract: graph.contract, task: { task_id: capsule.task_id, capsule_sha256: sha256(capsule) }, base_repository: graph.base_repository, dimensions: values, overall_level: level(Object.values(values).map(({ level: item }) => item)) };
  if (!validateRiskClassification(result).valid) throw new Error('Risk classification validation failed.'); return result;
}

export function validateRiskClassification(record) {
  if (!validateClassification(record)) return { valid: false, errors: validateClassification.errors };
  const actual = level(Object.values(record.dimensions).map(({ level: item }) => item));
  return actual === record.overall_level ? { valid: true, errors: [] } : { valid: false, errors: ['Overall risk level contradicts dimensions.'] };
}

export function authorizeClassification(classification, capsule) {
  const checked = validateRiskClassification(classification); if (!checked.valid) throw new Error(`Risk classification validation failed: ${JSON.stringify(checked.errors)}`);
  const high = classification.overall_level === 'high'; const medium = classification.overall_level === 'medium';
  const gates = profileGates(classification);
  const authorization = { schema_version: '1.0.0', status: 'authorized', classification, profile_gates: gates, allowed_autonomy: high ? 'none' : 'bounded_agent', human_approval_boundaries: high ? ['before_execution', 'before_external_effect', 'before_merge', 'before_deployment'] : ['before_merge', 'before_deployment'], verification_categories: ['task_verification', ...gates.flatMap(({ verification_categories }) => verification_categories)], proof_categories: capsule.verification.proofs, isolation: high || medium ? 'isolated_worktree' : 'current_worktree', tool_posture: high ? 'plan_only' : 'narrow_write', invalidation_reasons: ['contract_drift', 'profile_drift', 'base_revision_drift', 'task_graph_drift', 'capsule_drift', 'anchor_drift', 'unresolved_uncertainty'] };
  if (high) authorization.verification_categories.push('independent_review');
  if (!validateExecutionAuthorization(authorization).valid) throw new Error('Execution authorization validation failed.'); return authorization;
}

export function validateExecutionAuthorization(record) {
  if (!validateAuthorization(record)) return { valid: false, errors: validateAuthorization.errors };
  const high = record.classification.overall_level === 'high';
  if (stable(record.profile_gates) !== stable(profileGates(record.classification)) || record.profile_gates.some((gate) => gate.human_approval_boundaries.some((boundary) => !record.human_approval_boundaries.includes(boundary)) || gate.verification_categories.some((category) => !record.verification_categories.includes(category)))) return { valid: false, errors: ['Production risk-profile gates are missing, altered, or unenforced.'] };
  if (record.status === 'authorized' && record.allowed_autonomy === 'none' && record.tool_posture !== 'plan_only') return { valid: false, errors: ['No-autonomy authorization must be plan-only.'] };
  if (high && (record.allowed_autonomy !== 'none' || record.tool_posture !== 'plan_only' || !record.human_approval_boundaries.includes('before_execution') || record.isolation !== 'isolated_worktree' || !record.verification_categories.includes('independent_review'))) return { valid: false, errors: ['High-risk authorization lacks required controls.'] };
  if (record.human_approval_boundaries.includes('before_merge') === false || record.human_approval_boundaries.includes('before_deployment') === false) return { valid: false, errors: ['Merge and deployment always remain human boundaries.'] };
  return { valid: true, errors: [] };
}

export async function authorizeTaskExecution({ contract, graph, capsule, targetPath, signals }) {
  const contractDrift = await detectChangeContractDrift(contract, targetPath); const graphDrift = await detectTaskGraphDrift(graph, contract, targetPath);
  if (contractDrift.drifted || graphDrift.drifted || !validateContextCapsule(capsule).valid || graph.contract.contract_id !== contract.contract_id || graph.contract.sha256 !== sha256(contract) || capsule.base_repository.source_fingerprint !== graph.base_repository.source_fingerprint) throw new Error('Execution authorization denied: contract, profile, graph, capsule, or base revision drift detected.');
  return authorizeClassification(classifyRisk({ contract, graph, capsule, signals }), capsule);
}
