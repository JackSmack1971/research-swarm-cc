import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../../engineering/schemas/engineering-evidence-capsule.schema.json' with { type: 'json' };
import { validateAuthoritativeEvidence } from './authoritative-engineering.mjs';
import { validateFocusedResearchEvidence } from './focused-engineering-research.mjs';
import { validateFocusedVerificationEvidence } from './focused-engineering-verification.mjs';
import { compileEvidencePacket } from './evidence-bridge.mjs';
import { readJsonl } from './jsonl.mjs';

const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addFormat('date-time', { type: 'string', validate: value => !Number.isNaN(Date.parse(value)) });
const validate = ajv.compile(schema);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const result = (valid, errors = []) => ({ valid, errors });
const needScope = need => ({ repository: need.scope.repository, revision: need.scope.revision ?? null, dependencies: [...need.scope.dependencies], versions: [...need.scope.versions] });
const common = ({ capsule_id, need, producer, applicability, claims, sources, conflicts, gaps, freshness, lineage, limitations = [] }) => {
  const base = { schema_version: '1.0.0', capsule_id, knowledge_need_id: need.knowledge_need_id, producer, applicability, claims, sources, conflicts, gaps, freshness, identity: { digest: '', lineage: { source_evidence_id: producer.evidence_id, ...lineage } }, limitations, non_authorizing: true };
  base.identity.digest = hash(base); const checked = validateEngineeringEvidenceCapsule(base); if (!checked.valid) throw new Error(`Engineering Evidence Capsule validation failed: ${JSON.stringify(checked.errors)}`); return base;
};
const source = (item, mechanism, fallback = {}) => ({ source_id: item.source_id, locator: item.locator ?? fallback.locator ?? 'unavailable', title: item.title ?? item.source_id, publisher: item.publisher ?? fallback.publisher ?? 'unavailable', retrieved_at: item.accessed_at ?? item.retrieved_at ?? fallback.retrieved_at, mechanism, version_applicability: item.version_applicability ?? fallback.version_applicability ?? 'scope not otherwise specified' });
const verify = value => { const checked = validate(value); return checked ? result(true) : result(false, validate.errors); };

export function validateEngineeringEvidenceCapsule(value) {
  const checked = verify(value); if (!checked.valid) return checked;
  const errors = [];
  const claims = new Map(value.claims.map(claim => [claim.claim_id, claim]));
  const sources = new Map(value.sources.map(item => [item.source_id, item]));
  if (claims.size !== value.claims.length || sources.size !== value.sources.length) errors.push('Capsule claim and source IDs must be unique.');
  for (const claim of value.claims) for (const item of claim.evidence) if (!sources.has(item.source_id)) errors.push(`Claim ${claim.claim_id} references unknown source ${item.source_id}.`);
  for (const conflict of value.conflicts) for (const id of conflict.claim_ids) if (!claims.has(id)) errors.push(`Conflict ${conflict.id} references unknown claim ${id}.`);
  return result(errors.length === 0, errors);
}

export function compileT1EngineeringEvidenceCapsule({ need, evidence }) {
  if (!validateAuthoritativeEvidence(evidence).valid || evidence.knowledge_need_id !== need.knowledge_need_id) throw new Error('Invalid T1 evidence or knowledge-need mismatch.');
  if (evidence.result.status !== 'found' || !evidence.result.records.length || evidence.provenance.freshness === 'unknown' || evidence.escalation.required) throw new Error('T1 evidence is unavailable, stale, or requires escalation.');
  const retrieved = evidence.provenance.retrieved_at;
  const claims = evidence.result.records.map((record, index) => ({ claim_id: `clm_${evidence.evidence_id}_${index + 1}`, statement: JSON.stringify(record), scope: `${need.question} (${evidence.lookup_kind})`, materiality: need.materiality, confidence: evidence.result.status === 'found' ? 'medium' : 'low', verification: 'not_independently_verified', evidence: [{ source_id: evidence.evidence_id, locator: evidence.provenance.locator, relationship: 'supports' }] }));
  return common({ capsule_id: `eec_${evidence.evidence_id}`, need, producer: { tier: 'T1', mechanism: 'authoritative_lookup', evidence_id: evidence.evidence_id }, applicability: needScope(need), claims, sources: [source({ source_id: evidence.evidence_id, title: `${evidence.lookup_kind} lookup`, publisher: evidence.provenance.authority, locator: evidence.provenance.locator, retrieved_at: retrieved, version_applicability: String(evidence.scope.repository_version ?? 'requested scope') }, 'authoritative_lookup')], conflicts: evidence.conflicts.map((summary, i) => ({ id: `conf_${evidence.evidence_id}_${i + 1}`, claim_ids: claims.map(claim => claim.claim_id), summary, status: 'unresolved' })), gaps: evidence.unresolved_gaps, freshness: { retrieved_at: retrieved, status: evidence.provenance.freshness, retrieval_identity: hash(evidence) }, limitations: ['Authoritative lookup records are not independently verified.'] , lineage: {}});
}

export function compileT2EngineeringEvidenceCapsule({ need, evidence }) {
  if (!validateFocusedResearchEvidence(evidence).valid || evidence.knowledge_need_id !== need.knowledge_need_id) throw new Error('Invalid T2 evidence or knowledge-need mismatch.');
  if (!evidence.claims.length || evidence.escalation.required) throw new Error('T2 evidence is empty or requires escalation.');
  const sources = evidence.sources.map(item => source(item, 'focused_research'));
  return common({ capsule_id: `eec_${evidence.evidence_id}`, need, producer: { tier: 'T2', mechanism: 'focused_research', evidence_id: evidence.evidence_id }, applicability: needScope(need), claims: evidence.claims.map(claim => ({ claim_id: claim.claim_id, statement: claim.statement, scope: claim.scope, materiality: need.materiality, confidence: claim.confidence, verification: 'not_independently_verified', evidence: [...claim.supporting_evidence.map(item => ({ ...item, relationship: 'supports' })), ...claim.counter_evidence.map(item => ({ source_id: item.source_id, locator: item.locator, relationship: 'contradicts', note: item.summary }))] })), sources, conflicts: [], gaps: evidence.unresolved_gaps, freshness: { retrieved_at: sources.map(item => item.retrieved_at).sort().at(-1), status: 'recent', retrieval_identity: hash(evidence) }, limitations: ['Focused research has no independent verifier; escalation remains authoritative.'], lineage: {}});
}

export function compileT3EngineeringEvidenceCapsule({ need, researchEvidence, verificationEvidence }) {
  if (!validateFocusedResearchEvidence(researchEvidence).valid || !validateFocusedVerificationEvidence(verificationEvidence).valid || researchEvidence.knowledge_need_id !== need.knowledge_need_id || verificationEvidence.knowledge_need_id !== need.knowledge_need_id) throw new Error('Invalid T2/T3 evidence or knowledge-need mismatch.');
  const sourceMap = new Map(researchEvidence.sources.map(item => [item.source_id, source(item, 'focused_research')]));
  const disposition = new Map(verificationEvidence.claims.map(item => [item.claim_id, item]));
  const claims = researchEvidence.claims.map(claim => { const checked = disposition.get(claim.claim_id); return { claim_id: claim.claim_id, statement: claim.statement, scope: claim.scope, materiality: need.materiality, confidence: claim.confidence, verification: checked.disposition, evidence: [...claim.supporting_evidence.map(item => ({ ...item, relationship: 'supports' })), ...claim.counter_evidence.map(item => ({ source_id: item.source_id, locator: item.locator, relationship: 'contradicts', note: item.summary })), ...checked.checked_source_ids.map(source_id => ({ source_id, locator: sourceMap.get(source_id)?.locator ?? 'checked source', relationship: 'checked' }))] }; });
  return common({ capsule_id: `eec_${verificationEvidence.verification_id}`, need, producer: { tier: 'T3', mechanism: 'independent_verification', evidence_id: verificationEvidence.verification_id }, applicability: needScope(need), claims, sources: [...sourceMap.values()], conflicts: verificationEvidence.conflicts.map(item => ({ id: `conf_${item.claim_id}`, claim_ids: [item.claim_id], summary: item.summary, status: item.unresolved ? 'unresolved' : 'resolved' })), gaps: [...researchEvidence.unresolved_gaps, ...verificationEvidence.uncertainty], freshness: { retrieved_at: [...researchEvidence.sources].map(item => item.accessed_at).sort().at(-1), status: 'recent', retrieval_identity: hash({ researchEvidence, verificationEvidence }) }, limitations: ['Capsule contains only the bounded T2 evidence and T3 disposition; it is not a research archive.'], lineage: {}});
}

export async function compileT4EngineeringEvidenceCapsule({ archiveDirectory, need, claim_ids, engineering_question = need.question, selection_rationale = 'Selected retained claims are relevant to the scoped engineering knowledge need.' }) {
  if (!need?.knowledge_need_id || !Array.isArray(claim_ids) || !claim_ids.length) throw new Error('T4 capsule requires a knowledge need and selected claim IDs.');
  const packet = await compileEvidencePacket({ archiveDirectory, packet_id: `epk_${need.knowledge_need_id.slice(3)}`, engineering_question, selection_rationale, claim_ids });
  const retrieved = JSON.parse(await readFile(`${archiveDirectory}/manifest.json`, 'utf8')).created_at;
  const archiveSources = new Map((await readJsonl(`${archiveDirectory}/sources.jsonl`)).records.map(item => [item.source_id, item]));
  const sourceMap = new Map(packet.sources.map(item => [item.source_id, item]));
  const sources = [...new Set(packet.claims.flatMap(claim => [...claim.supporting_evidence, ...claim.counter_evidence].map(item => item.source_id)))].sort().map(id => { const item = sourceMap.get(id); const canonical = archiveSources.get(id); const locator = packet.claims.flatMap(claim => [...claim.supporting_evidence, ...claim.counter_evidence]).find(ref => ref.source_id === id)?.locator; return source({ ...item, ...canonical, source_id: id, locator, retrieved_at: canonical?.accessed_at ?? retrieved, version_applicability: canonical?.version_applicability ?? (need.scope.versions.join(', ') || 'scoped repository') }, 'validated_archive_bridge'); });
  return common({ capsule_id: `eec_${packet.research_run.run_id}_${hash(claim_ids).slice(0, 8)}`, need, producer: { tier: 'T4', mechanism: 'validated_archive_bridge', evidence_id: packet.packet_id }, applicability: needScope(need), claims: packet.claims.map(claim => ({ claim_id: claim.claim_id, statement: claim.statement, scope: claim.scope, materiality: claim.materiality, confidence: claim.confidence, verification: claim.verification_event_ids.length ? 'confirmed' : 'unverifiable', evidence: [...claim.supporting_evidence.map(item => ({ ...item, relationship: 'supports' })), ...claim.counter_evidence.map(item => ({ ...item, relationship: 'contradicts' }))] })), sources, conflicts: packet.conflicts.map(item => ({ id: item.conflict_id, claim_ids: item.claim_ids, summary: item.reason, status: item.status })), gaps: packet.coverage_gaps.map(item => item.description), freshness: { retrieved_at: retrieved, status: 'archive_validated', retrieval_identity: packet.research_run.archive_sha256 }, limitations: ['Capsule is a scoped projection; the validated archive remains authoritative for complete T4 evidence.'], lineage: packet.research_run });
}

export function validateCapsuleIdentity(capsule) { const checked = validateEngineeringEvidenceCapsule(capsule); if (!checked.valid) return checked; const copy = structuredClone(capsule); const digest = copy.identity.digest; copy.identity.digest = ''; return hash(copy) === digest ? result(true) : result(false, ['identity.digest does not match capsule contents.']); }
