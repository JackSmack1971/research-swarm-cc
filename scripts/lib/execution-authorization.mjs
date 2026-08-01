import Ajv2020 from 'ajv/dist/2020.js';
import classificationSchema from '../../engineering/schemas/risk-classification.schema.json' with { type: 'json' };
import authorizationSchema from '../../engineering/schemas/execution-authorization.schema.json' with { type: 'json' };
import profileSchema from '../../engineering/schemas/project-profile.schema.json' with { type: 'json' };
import taskGraphSchema from '../../engineering/schemas/task-graph.schema.json' with { type: 'json' };
import { detectChangeContractDrift, validateChangeContract } from './change-contract.mjs';
import { detectTaskGraphDrift, sha256, validateContextCapsule } from './task-graph.mjs';

const dimensions = ['security_authentication_authorization', 'privacy_sensitive_data', 'data_integrity', 'migrations', 'external_apis', 'financial_high_consequence', 'ui_accessibility', 'infrastructure_configuration', 'dependency_introduction', 'blast_radius', 'reversibility'];
const rank = { none: 0, low: 1, medium: 2, high: 3 };
const level = (values) => ['low', 'medium', 'high'][Math.max(0, ...values.map((item) => rank[item])) - 1] ?? 'low';
const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addFormat('date-time', { type: 'string', validate: (value) => !Number.isNaN(Date.parse(value)) });
ajv.addSchema(profileSchema); ajv.addSchema(taskGraphSchema); ajv.addSchema(classificationSchema);
const validateClassification = ajv.compile(classificationSchema); const validateAuthorization = ajv.compile(authorizationSchema);
const defaultDimension = () => ({ level: 'none', rationale: 'No material change is recorded for this dimension.' });

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
  const authorization = { schema_version: '1.0.0', status: 'authorized', classification, allowed_autonomy: high ? 'none' : 'bounded_agent', human_approval_boundaries: high ? ['before_execution', 'before_external_effect', 'before_merge', 'before_deployment'] : medium ? ['before_merge', 'before_deployment'] : ['before_merge', 'before_deployment'], verification_categories: ['task_verification'], proof_categories: capsule.verification.proofs, isolation: high || medium ? 'isolated_worktree' : 'current_worktree', tool_posture: high ? 'plan_only' : 'narrow_write', invalidation_reasons: ['contract_drift', 'profile_drift', 'base_revision_drift', 'task_graph_drift', 'capsule_drift', 'anchor_drift', 'unresolved_uncertainty'] };
  if (high) authorization.verification_categories.push('independent_review');
  if (classification.dimensions.security_authentication_authorization.level !== 'none') authorization.verification_categories.push('security_review');
  if (classification.dimensions.migrations.level !== 'none') authorization.verification_categories.push('migration_proof');
  if (classification.dimensions.ui_accessibility.level !== 'none') authorization.verification_categories.push('accessibility_proof');
  if (classification.dimensions.dependency_introduction.level !== 'none') authorization.verification_categories.push('dependency_review');
  if (classification.dimensions.external_apis.level !== 'none') authorization.verification_categories.push('external_api_proof');
  if (!validateExecutionAuthorization(authorization).valid) throw new Error('Execution authorization validation failed.'); return authorization;
}

export function validateExecutionAuthorization(record) {
  if (!validateAuthorization(record)) return { valid: false, errors: validateAuthorization.errors };
  const high = record.classification.overall_level === 'high';
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
