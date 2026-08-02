import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../../engineering/schemas/delivery-manifest.schema.json' with { type: 'json' };
import profileSchema from '../../engineering/schemas/project-profile.schema.json' with { type: 'json' };
import { validateChangeContract } from './change-contract.mjs';
import { detectTaskGraphDrift, sha256, validateContextCapsule, validateTaskGraph } from './task-graph.mjs';
import { validateExecutionAuthorization } from './execution-authorization.mjs';
import { validateExecutionEvent } from './task-executor.mjs';
import { validateCriterionProof, validateVerificationEvent } from './task-verifier.mjs';

const kinds = ['profile', 'contract', 'graph', 'capsule', 'authorization', 'execution_event', 'verification_events', 'criterion_proofs'];
const ajv = new Ajv2020({ allErrors: true, strict: true }); ajv.addFormat('date-time', { type: 'string', validate: (value) => !Number.isNaN(Date.parse(value)) }); ajv.addSchema(profileSchema); const validate = ajv.compile(schema);
const digest = (value) => createHash('sha256').update(value).digest('hex');
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const terminalStatus = (proofs) => !proofs.length ? 'not_run' : proofs.every(({ status }) => status === 'proven') ? 'proven' : proofs.some(({ status }) => status === 'blocked') ? 'blocked' : proofs.some(({ status }) => status === 'failed') ? 'failed' : proofs.some(({ status }) => status === 'unverifiable') ? 'unverifiable' : 'not_run';
const deliveryStatus = (execution, proofs) => execution.kind === 'scope_rejected' ? 'rejected' : execution.kind !== 'complete' ? 'stopped' : proofs.length && terminalStatus(proofs) === 'proven' ? 'verified' : terminalStatus(proofs) === 'blocked' ? 'blocked' : 'not_verified';

export function validateDeliveryManifest(manifest) { return validate(manifest) ? { valid: true, errors: [] } : { valid: false, errors: validate.errors }; }

async function sources(manifest, manifestPath) {
  const root = path.dirname(path.resolve(manifestPath)); const found = new Map();
  for (const ref of manifest.references) {
    if (found.has(ref.kind) || !kinds.includes(ref.kind)) throw new Error('Delivery manifest has duplicate or unknown canonical references.');
    const target = path.resolve(root, ref.path); if (!target.startsWith(`${root}${path.sep}`)) throw new Error('Delivery manifest reference escapes its directory.');
    const raw = await readFile(target, 'utf8').catch(() => { throw new Error(`Missing canonical reference: ${ref.kind}.`); });
    if (digest(raw) !== ref.sha256) throw new Error(`Canonical reference digest drift: ${ref.kind}.`);
    found.set(ref.kind, { path: target, value: JSON.parse(raw) });
  }
  if (kinds.some((kind) => !found.has(kind))) throw new Error('Delivery manifest lacks a required canonical reference.');
  return found;
}

export async function loadDeliveryHandoff(manifestPath, targetPath) {
  const manifest = await readJson(manifestPath); const manifestCheck = validateDeliveryManifest(manifest); if (!manifestCheck.valid) throw new Error(`Delivery manifest schema validation failed: ${JSON.stringify(manifestCheck.errors)}`);
  const records = await sources(manifest, manifestPath); const get = (kind) => records.get(kind).value;
  const [profile, contract, graph, capsule, authorization, execution, events, proofs] = kinds.map(get);
  if (!validateChangeContract(contract).valid || contract.lifecycle_state !== 'accepted' || !validateTaskGraph(graph, contract).valid || !validateContextCapsule(capsule).valid || !validateExecutionAuthorization(authorization).valid || !validateExecutionEvent(execution).valid || !Array.isArray(events) || events.some((item) => !validateVerificationEvent(item).valid) || !Array.isArray(proofs) || proofs.some((item) => !validateCriterionProof(item).valid)) throw new Error('A canonical delivery record is invalid.');
  if (contract.contract_id !== manifest.contract.contract_id || sha256(contract) !== manifest.contract.sha256 || JSON.stringify(profile.target) !== JSON.stringify(manifest.base_repository) || graph.contract.contract_id !== contract.contract_id || graph.contract.sha256 !== sha256(contract) || capsule.task_id !== execution.task_id || !manifest.tasks.completed.includes(capsule.task_id)) throw new Error('Delivery manifest identity linkage is inconsistent.');
  if (!manifest.accepted_decision_ids.every((id) => contract.decisions.some(({ decision_id }) => decision_id === id)) || !manifest.accepted_decision_ids.every((id) => capsule.decisions.some(({ decision_id }) => decision_id === id))) throw new Error('Delivery manifest references an unknown accepted decision.');
  if (execution.event_id !== manifest.final_change.execution_event_id || execution.result.change_identity !== manifest.final_change.change_identity || JSON.stringify(execution.file_changes) !== JSON.stringify(manifest.final_change.changed_files)) throw new Error('Delivery manifest final change identity is inconsistent.');
  const criteria = new Set(capsule.acceptance_criteria.map(({ criterion_id }) => criterion_id));
  if (execution.kind === 'complete' && (proofs.length !== criteria.size || proofs.some((proof) => !criteria.has(proof.criterion_id) || proof.execution.event_id !== execution.event_id || proof.execution.change_identity !== execution.result.change_identity))) throw new Error('Delivery manifest proof coverage is incomplete or stale.');
  const expectedProofs = proofs.map(({ criterion_id, proof_id, status, rationale }) => ({ criterion_id, proof_id, status, rationale })).sort((a, b) => a.criterion_id.localeCompare(b.criterion_id));
  const statedProofs = [...manifest.verification.proof_statuses].sort((a, b) => a.criterion_id.localeCompare(b.criterion_id));
  if (JSON.stringify(expectedProofs) !== JSON.stringify(statedProofs) || manifest.verification.status !== terminalStatus(proofs) || manifest.status !== deliveryStatus(execution, proofs) || !manifest.verification.event_ids.every((id) => events.some(({ verification_event_id }) => verification_event_id === id))) throw new Error('Delivery manifest verification summary is inconsistent.');
  const drift = await detectTaskGraphDrift(graph, contract, targetPath); if (drift.drifted) throw new Error('Delivery handoff is stale: regenerate contract, graph, capsules, authorization, and manifest.');
  return { manifest, contract, graph, capsule, authorization, execution, events, proofs, current: drift.current };
}

export function renderDeliveryHandoff({ manifest, contract, capsule, execution, proofs }) {
  const proofLines = proofs.map(({ criterion_id, status, rationale }) => `- ${criterion_id}: ${status} — ${rationale}`).join('\n') || '- No verification ran.';
  const unresolved = manifest.unresolved.map(({ kind, statement }) => `- ${kind}: ${statement}`).join('\n') || '- None recorded.';
  return `# Delivery handoff: ${manifest.delivery_id}\n\nStatus: **${manifest.status}**. This is a derived view; canonical records remain the referenced files.\n\n## Intent\n\n- Contract: ${contract.contract_id} (${manifest.contract.sha256})\n- Task: ${capsule.task_id} — ${capsule.objective}\n- Decisions: ${manifest.accepted_decision_ids.join(', ')}\n\n## Change and verification\n\n- Executor event: ${execution.event_id}\n- Final diff identity: ${execution.result.change_identity ?? 'none'}\n- Changed files: ${execution.file_changes.join(', ') || 'none'}\n- Verification: ${manifest.verification.status}; repairs: ${manifest.verification.repair_rounds}\n${proofLines}\n\n## Unresolved\n\n${unresolved}\n\n## Integration\n\n${manifest.integration.status}: ${manifest.integration.statement}\n\n## Next authorized action\n\n${manifest.next_action}\n`;
}
