import Ajv2020 from 'ajv/dist/2020.js';
import executionSchema from '../../engineering/schemas/execution-event.schema.json' with { type: 'json' };
import eventSchema from '../../engineering/schemas/verification-event.schema.json' with { type: 'json' };
import proofSchema from '../../engineering/schemas/criterion-proof.schema.json' with { type: 'json' };
import { validateChangeContract } from './change-contract.mjs';
import { sha256, validateContextCapsule, validateTaskGraph } from './task-graph.mjs';
import { validateExecutionAuthorization } from './execution-authorization.mjs';

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateExecution = ajv.compile(executionSchema); const validateEvent = ajv.compile(eventSchema); const validateProof = ajv.compile(proofSchema);
const freeze = (value) => { if (value && typeof value === 'object') { for (const item of Object.values(value)) freeze(item); Object.freeze(value); } return value; };
const requiredKinds = (criterion) => criterion.required_proof_kinds ?? ['command'];
const terminal = new Set(['proven', 'failed', 'blocked', 'unverifiable']);

export function validateCriterionProof(record) { return validateProof(record) ? { valid: true, errors: [] } : { valid: false, errors: validateProof.errors }; }
export function validateVerificationEvent(record) { return validateEvent(record) ? { valid: true, errors: [] } : { valid: false, errors: validateEvent.errors }; }

function checkedInput({ contract, graph, capsule, authorization, executionEvent, implementationAgentId, verifierAgentId }) {
  if (!validateChangeContract(contract).valid || contract.lifecycle_state !== 'accepted' || !validateTaskGraph(graph, contract).valid || !validateContextCapsule(capsule).valid || !validateExecutionAuthorization(authorization).valid) throw new Error('Verification requires current valid contract, graph, capsule, and authorization.');
  if (!validateExecution(executionEvent) || executionEvent.kind !== 'complete' || executionEvent.result.status !== 'unverified_implementation' || !executionEvent.result.change_identity) throw new Error('Verification requires an immutable unverified executor completion event.');
  if (executionEvent.task_id !== capsule.task_id || executionEvent.base_revision !== capsule.base_repository.git_revision || graph.contract.sha256 !== sha256(contract)) throw new Error('Verification input identity is stale or mismatched.');
  if (!implementationAgentId || !verifierAgentId || implementationAgentId === verifierAgentId) throw new Error('Implementation and verification identities must be distinct.');
}

function checkProofs({ proofs, capsule, executionEvent, verifierAgentId, changeIdentity, verificationEventId }) {
  const expected = new Map(capsule.acceptance_criteria.map((criterion) => [criterion.criterion_id, criterion]));
  if (!Array.isArray(proofs) || proofs.length !== expected.size) throw new Error('Every acceptance criterion requires exactly one terminal proof record.');
  const seen = new Set();
  for (const proof of proofs) {
    if (!validateProof(proof) || proof.verification_event_id !== verificationEventId || proof.execution.event_id !== executionEvent.event_id || proof.execution.change_identity !== changeIdentity || proof.verifier.verifier_id !== verifierAgentId || proof.verifier.separate_from_executor !== true || proof.verifier.executor_reasoning_available !== false || !terminal.has(proof.status) || !expected.has(proof.criterion_id) || seen.has(proof.criterion_id)) throw new Error('Criterion proof is invalid, stale, duplicated, or not fresh-context evidence.');
    seen.add(proof.criterion_id);
    if (proof.status === 'proven') {
      const kinds = new Set(proof.evidence.map(({ category }) => category));
      if (requiredKinds(expected.get(proof.criterion_id)).some((kind) => !kinds.has(kind))) throw new Error(`Criterion ${proof.criterion_id} lacks required proof evidence.`);
    }
  }
  return freeze(proofs.map((proof) => ({ ...proof, evidence: proof.evidence.map((item) => ({ ...item })) })));
}

function checkEvent(record, executionEvent, verifierAgentId, changeIdentity) {
  if (!validateEvent(record) || record.task_id !== executionEvent.task_id || record.execution.event_id !== executionEvent.event_id || record.execution.change_identity !== changeIdentity || record.verifier.verifier_id !== verifierAgentId || record.verifier.separate_from_executor !== true || record.verifier.executor_reasoning_available !== false) throw new Error('Verification event is invalid, stale, or not independent.');
  return freeze({ ...record, execution: { ...record.execution }, verifier: { ...record.verifier }, evidence: record.evidence.map((item) => ({ ...item })) });
}

const outcome = (proofs) => proofs.some(({ status }) => status === 'failed') ? 'failed' : proofs.some(({ status }) => status === 'blocked') ? 'blocked' : proofs.some(({ status }) => status === 'unverifiable') ? 'unverifiable' : 'proven';

export async function verifyAuthorizedTask({ contract, graph, capsule, authorization, executionEvent, implementationAgentId = 'engineering-executor', verifierAgentId = 'engineering-verifier', runVerifier, runRepair, maxRepairs = 2 }) {
  checkedInput({ contract, graph, capsule, authorization, executionEvent, implementationAgentId, verifierAgentId });
  if (typeof runVerifier !== 'function' || !Number.isInteger(maxRepairs) || maxRepairs < 0 || maxRepairs > 2) throw new Error('Verification requires a verifier and a bounded repair limit of at most two.');
  const events = []; const contextIds = new Set(); let changeIdentity = executionEvent.result.change_identity; let proofs = [];
  for (let attempt = 0; attempt <= maxRepairs; attempt += 1) {
    const result = await runVerifier({ attempt, input: { contract: { contract_id: contract.contract_id, sha256: sha256(contract) }, authorization: { verification_categories: authorization.verification_categories, proof_categories: authorization.proof_categories }, capsule, execution_event: executionEvent, changed_files: executionEvent.file_changes, change_identity: changeIdentity } });
    const verificationEvent = checkEvent(result?.event, executionEvent, verifierAgentId, changeIdentity);
    if (contextIds.has(verificationEvent.verifier.fresh_context_id)) throw new Error('Every verification attempt requires a new fresh context.');
    contextIds.add(verificationEvent.verifier.fresh_context_id);
    proofs = checkProofs({ proofs: result?.proofs, capsule, executionEvent, verifierAgentId, changeIdentity, verificationEventId: verificationEvent.verification_event_id });
    if (verificationEvent.status !== outcome(proofs)) throw new Error('Verification event status contradicts its criterion proofs.');
    events.push(verificationEvent);
    if (proofs.every(({ status }) => status === 'proven')) return freeze({ status: 'verified', repair_rounds: attempt, events, proofs });
    if (attempt === maxRepairs || typeof runRepair !== 'function') return freeze({ status: 'not_verified', repair_rounds: attempt, events, proofs });
    const defects = proofs.filter(({ status }) => status !== 'proven').map(({ criterion_id, status, rationale }) => ({ criterion_id, status, rationale }));
    const repair = await runRepair({ attempt: attempt + 1, defects, change_identity: changeIdentity });
    if (!repair?.change_identity || repair.change_identity === changeIdentity) return freeze({ status: 'not_verified', repair_rounds: attempt + 1, events, proofs });
    changeIdentity = repair.change_identity;
  }
}
