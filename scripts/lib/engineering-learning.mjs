import { createHash } from 'node:crypto';
import { mkdir, open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import evidenceSchema from '../../engineering/schemas/engineering-learning-evidence.schema.json' with { type: 'json' };
import lessonSchema from '../../engineering/schemas/engineering-lesson.schema.json' with { type: 'json' };
import stateSchema from '../../engineering/schemas/engineering-learning-state.schema.json' with { type: 'json' };
import { loadDeliveryHandoff } from './delivery-handoff.mjs';

export const CONSTITUTION_VERSION = '1.0.0';
export const CONSTITUTION_HASH = createHash('sha256').update('engineering-learning-constitution:1.0.0:delivery-evidence-only:protected-controls:dormant-until-final-acceptance').digest('hex');
export const LIMITS = Object.freeze({ lessons: 12, directives: 4, characters: 6000, applicability: 8 });
export const PROVENANCE = Object.freeze({ synthetic: 'synthetic_fixture', baseline: 'plain_claude_baseline', live: 'live_delivery' });
const STATES = ['provisional', 'review', 'active', 'rejected', 'rolled_back'];
const SIGNALS = new Set(['review_finding', 'repair_rework', 'failed_acceptance', 'runtime_regression', 'user_correction', 'human_friction', 'complexity_problem', 'post_delivery_outcome', 'retrieval_outcome']);
const INJECTION = /\b(?:ignore|disregard|bypass|disable|weaken|skip)\b\s+(?:all\s+)?(?:previous|the|security|validation|rules|instructions)?/i;
const PROTECTED = /\b(?:constitution|security|risk gate|permission|provenance|verification|canonical|protected surface|merge|deploy|research learning)\b/i;
const UNIVERSAL = /^(?:all|any|always|never|every|universal|general|\*)$/i;
const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addSchema(evidenceSchema); ajv.addSchema(lessonSchema); const validateEvidenceSchema = ajv.compile(evidenceSchema); const validateLessonSchema = ajv.compile(lessonSchema); const validateStateSchema = ajv.compile(stateSchema);
const stable = (value) => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value);
const hash = (value) => createHash('sha256').update(typeof value === 'string' ? value : stable(value)).digest('hex');
const now = () => new Date().toISOString();
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const defaultState = () => ({ schema_version: '1.0.0', registry_id: 'elreg_engineering_learning', constitution_version: CONSTITUTION_VERSION, constitution_hash: CONSTITUTION_HASH, activation: 'dormant', activation_gate: 'pending_final_claude_code_acceptance', evidence: [], provisional: [], review: [], active: [], rejected: [], rolled_back: [], events: [] });

export function engineeringLearningRoot(value = process.env.ENGINEERING_LEARNING_ROOT) { return path.resolve(value || 'artifacts/engineering-learning'); }
export function validateEngineeringLearningEvidence(record) { return validateEvidenceSchema(record) ? { valid: true, errors: [] } : { valid: false, errors: validateEvidenceSchema.errors }; }
export function validateEngineeringLesson(record) { return validateLessonSchema(record) ? { valid: true, errors: [] } : { valid: false, errors: validateLessonSchema.errors }; }
export function validateEngineeringLearningState(record) { return validateStateSchema(record) ? { valid: true, errors: [] } : { valid: false, errors: validateStateSchema.errors }; }
export function constitution() { return { version: CONSTITUTION_VERSION, hash: CONSTITUTION_HASH, activation: 'dormant until final Claude Code project acceptance' }; }
export async function atomicWrite(file, value) { const temporary = `${file}.${process.pid}.${hash(`${file}:${now()}`).slice(0, 8)}.tmp`; await writeFile(temporary, value, 'utf8'); await rename(temporary, file); }
async function readJson(file) { try { return JSON.parse(await readFile(file, 'utf8')); } catch { return null; } }
export async function readState(root = engineeringLearningRoot()) { const state = await readJson(path.join(root, 'state.json')); return state && validateEngineeringLearningState(state).valid && state.constitution_hash === CONSTITUTION_HASH ? state : defaultState(); }
export async function withEngineeringLearningLock(root, callback, { waitMs = 5000, staleMs = 30000 } = {}) { const lock = path.join(root, 'lock', 'registry.lock'); await mkdir(path.dirname(lock), { recursive: true }); const deadline = Date.now() + waitMs; while (true) { try { const handle = await open(lock, 'wx'); try { await handle.writeFile(json({ pid: process.pid, acquired_at: now() })); return await callback(); } finally { await handle.close(); await rm(lock, { force: true }); } } catch (error) { if (error.code !== 'EEXIST') throw error; try { if (Date.now() - (await stat(lock)).mtimeMs > staleMs) await rm(lock, { force: true }); } catch {} if (Date.now() >= deadline) throw new Error('Timed out waiting for engineering-learning registry lock.'); await new Promise((resolve) => setTimeout(resolve, 25)); } } }
export async function writeState(root, state) { const checked = validateEngineeringLearningState(state); if (!checked.valid || state.constitution_hash !== CONSTITUTION_HASH) throw new Error(`Engineering-learning state is invalid: ${JSON.stringify(checked.errors)}`); await mkdir(root, { recursive: true }); await atomicWrite(path.join(root, 'state.json'), json(state)); }
function safeApplicability(lesson) { return lesson.applicability.length > 0 && lesson.applicability.length <= LIMITS.applicability && !lesson.applicability.some((item) => UNIVERSAL.test(item.trim())); }
function safeText(lesson) { const all = [lesson.observed_problem, lesson.root_cause, lesson.recommended_behavior, ...lesson.applicability, ...lesson.exclusions].join('\n'); return !INJECTION.test(all) && !PROTECTED.test(lesson.recommended_behavior); }
export function safeEngineeringLesson(lesson) { const checked = validateEngineeringLesson(lesson); return checked.valid && lesson.constitution_hash === CONSTITUTION_HASH && safeApplicability(lesson) && safeText(lesson); }
const evidenceById = (state, ids) => ids.map((id) => state.evidence.find((item) => item.evidence_id === id)).filter(Boolean);
export function evidenceEligible(state, lesson) { const evidence = evidenceById(state, lesson.supporting_evidence_ids); return evidence.length === lesson.supporting_evidence_ids.length && evidence.length > 0 && evidence.every((item) => item.provenance_kind === PROVENANCE.live && item.live_eligible === true); }
function event(state, lesson, from, to, reason) { state.events.push({ event_id: `ele_${hash({ lesson_id: lesson.lesson_id, from, to, reason }).slice(0, 16)}`, lesson_id: lesson.lesson_id, from, to, reason }); }
function move(state, lesson, to, reason) { const from = lesson.status; const source = state[from]; if (!source) return; const index = source.findIndex(({ lesson_id }) => lesson_id === lesson.lesson_id); if (index < 0) return; source.splice(index, 1); const changed = { ...lesson, status: to }; state[to].push(changed); event(state, changed, from, to, reason); }
function key(lesson) { return JSON.stringify([lesson.signal_type, lesson.recommended_behavior.trim().toLowerCase(), [...lesson.applicability].map((item) => item.toLowerCase()).sort(), [...lesson.exclusions].map((item) => item.toLowerCase()).sort()]); }
export function registerLesson(state, evidence, lesson) {
  if (!safeEngineeringLesson(lesson) || lesson.supporting_evidence_ids.length !== 1 || lesson.supporting_evidence_ids[0] !== evidence.evidence_id) throw new Error('Engineering lesson is invalid, unsafe, or not bound to exactly one evidence record.');
  if (!state.evidence.some(({ evidence_id }) => evidence_id === evidence.evidence_id)) state.evidence.push(evidence);
  if (state.evidence.filter(({ evidence_id }) => evidence_id === evidence.evidence_id).length > 1) return { duplicate: true, lesson_id: lesson.lesson_id };
  const existing = [...state.provisional, ...state.review, ...state.active, ...state.rejected, ...state.rolled_back].find((item) => key(item) === key(lesson));
  if (existing) { existing.supporting_evidence_ids = [...new Set([...existing.supporting_evidence_ids, ...lesson.supporting_evidence_ids])]; return { duplicate: true, lesson_id: existing.lesson_id }; }
  state.provisional.push({ ...lesson, status: 'provisional' }); return { duplicate: false, lesson_id: lesson.lesson_id };
}
export function reviewLesson(state, lessonId, review) { const lesson = state.review.find(({ lesson_id }) => lesson_id === lessonId); if (!lesson) throw new Error('Lesson is not awaiting review.'); if (!review?.review_id || !review.reviewer_id || !['approve', 'reject'].includes(review.outcome) || !review.rationale) throw new Error('Independent engineering-learning review is invalid.'); lesson.review = review; return review.outcome; }
export function advanceEngineeringLearning(state) {
  for (const lesson of [...state.provisional]) move(state, lesson, 'review', 'provisional lesson requires explicit review');
  for (const lesson of [...state.review]) {
    if (!lesson.review) continue;
    if (lesson.review.outcome === 'reject') { move(state, lesson, 'rejected', 'independent review rejected lesson'); continue; }
    if (!evidenceEligible(state, lesson)) { move(state, lesson, 'rejected', 'synthetic, baseline, stale, or insufficient delivery evidence cannot promote'); continue; }
    if (state.activation !== 'enabled' || state.activation_gate !== 'satisfied') continue;
    move(state, lesson, 'active', 'independent review passed and final acceptance gate is satisfied');
  }
  const groups = new Map(); for (const lesson of state.active) if (lesson.conflict_set_id) groups.set(lesson.conflict_set_id, [...(groups.get(lesson.conflict_set_id) || []), lesson]);
  for (const group of groups.values()) { const ranked = [...group].sort((a, b) => b.applicability.length - a.applicability.length || a.lesson_id.localeCompare(b.lesson_id)); for (const lesson of ranked.slice(1)) move(state, lesson, 'rejected', 'conflict set lost to the more specific lesson'); }
  for (const lesson of [...state.active].slice(LIMITS.lessons)) move(state, lesson, 'rejected', 'active lesson limit exceeded');
  return state;
}
export function rollbackEngineeringLesson(state, lessonId, reason = 'explicit rollback') { const lesson = state.active.find(({ lesson_id }) => lesson_id === lessonId); if (!lesson) throw new Error('Active engineering lesson not found.'); move(state, lesson, 'rolled_back', reason); return lessonId; }
export function activateEngineeringLearning(state, attestation) {
  if (attestation?.kind !== 'final_claude_code_project_acceptance' || !attestation.acceptance_id || !attestation.accepted_by || !Array.isArray(attestation.evidence_ids) || !attestation.evidence_ids.length) throw new Error('Final Claude Code acceptance attestation is required.');
  const evidence = evidenceById(state, attestation.evidence_ids); if (evidence.length !== attestation.evidence_ids.length || evidence.some((item) => !item.live_eligible)) throw new Error('Final acceptance requires only eligible live delivery evidence.');
  state.activation = 'enabled'; state.activation_gate = 'satisfied'; return state;
}
export function compileEngineeringPolicy(state, query = '') {
  if (state.activation !== 'enabled' || state.activation_gate !== 'satisfied') return { policy_bundle_id: `elp_${hash({ dormant: true, constitution: CONSTITUTION_HASH }).slice(0, 16)}`, selected_lesson_ids: [], directives: [], exclusions: state.active.map(({ lesson_id }) => lesson_id).sort(), constitution_version: CONSTITUTION_VERSION, constitution_hash: CONSTITUTION_HASH, dormant: true, rationale: 'Engineering learning is dormant pending final Claude Code project acceptance.' };
  const tokens = new Set(String(query).toLowerCase().match(/[a-z0-9]{3,}/g) || []); const selected = state.active.filter((lesson) => safeEngineeringLesson(lesson) && evidenceEligible(state, lesson) && (!tokens.size || lesson.applicability.some((condition) => [...tokens].some((token) => condition.toLowerCase().includes(token)))) && !lesson.exclusions.some((condition) => [...tokens].some((token) => condition.toLowerCase().includes(token)))).sort((a, b) => b.applicability.length - a.applicability.length || a.lesson_id.localeCompare(b.lesson_id)).slice(0, LIMITS.lessons);
  const directives = []; let characters = 0; for (const lesson of selected) { if (directives.length >= LIMITS.directives || characters + lesson.recommended_behavior.length > LIMITS.characters) continue; directives.push({ lesson_id: lesson.lesson_id, directive: lesson.recommended_behavior }); characters += lesson.recommended_behavior.length; }
  const basis = { selected_lesson_ids: directives.map(({ lesson_id }) => lesson_id), directives, constitution_version: CONSTITUTION_VERSION, constitution_hash: CONSTITUTION_HASH }; return { policy_bundle_id: `elp_${hash(basis).slice(0, 16)}`, ...basis, exclusions: state.active.map(({ lesson_id }) => lesson_id).filter((id) => !basis.selected_lesson_ids.includes(id)).sort(), dormant: false, rationale: directives.length ? 'Bounded live-delivery lessons selected by explicit applicability.' : 'No applicable safe engineering lessons.' };
}
export async function registerEngineeringEvidence({ root = engineeringLearningRoot(), evidence, lesson }) {
  const checked = validateEngineeringLearningEvidence(evidence); if (!checked.valid) throw new Error(`Engineering evidence is invalid: ${JSON.stringify(checked.errors)}`); if (!SIGNALS.has(evidence.signal_type)) throw new Error('Unsupported engineering signal.');
  if (evidence.signal_type === 'retrieval_outcome' && evidence.retrieval_outcome.evidence_quality !== 'sufficient') throw new Error('Conflicting or insufficient retrieval outcome evidence fails closed.');
  const hasDelivery = Boolean(evidence.manifest_path && evidence.target_path); const handoff = hasDelivery ? await loadDeliveryHandoff(evidence.manifest_path, evidence.target_path) : null; const rawManifest = hasDelivery ? await readFile(evidence.manifest_path, 'utf8') : null; const manifest = handoff?.manifest; if (manifest && evidence.signal_source.kind === 'delivery_manifest' && evidence.signal_source.record_id !== manifest.delivery_id) throw new Error('Signal source does not identify the supplied delivery manifest.');
  if (evidence.retrieval_outcome?.delivery && (!manifest || evidence.retrieval_outcome.delivery.delivery_id !== manifest.delivery_id || evidence.retrieval_outcome.delivery.manifest_sha256 !== hash(rawManifest))) throw new Error('Retrieval outcome delivery linkage is invalid.');
  if (manifest?.evidence_provenance?.kind && manifest.evidence_provenance.kind !== evidence.provenance_kind) throw new Error('Evidence provenance contradicts the delivery manifest.');
  const live = evidence.provenance_kind === PROVENANCE.live; const liveEligible = live && manifest?.evidence_provenance?.kind === PROVENANCE.live && manifest.status === 'verified' && manifest.verification.status === 'proven' && handoff.execution.kind === 'complete' && handoff.proofs.length > 0 && handoff.proofs.every(({ status }) => status === 'proven') && evidence.runtime_attestation?.kind === 'claude_code_live_session' && evidence.runtime_attestation.session_id === manifest.evidence_provenance.session_id;
  const record = { ...evidence, ...(manifest ? { manifest_sha256: hash(rawManifest), delivery_id: manifest.delivery_id, execution_event_id: manifest.final_change.execution_event_id, verification_event_ids: [...manifest.verification.event_ids], criterion_proof_ids: manifest.verification.proof_statuses.map(({ proof_id }) => proof_id) } : {}), live_eligible: liveEligible, accepted_for_learning: false };
  const state = await readState(root); const duplicate = state.evidence.some(({ evidence_id }) => evidence_id === evidence.evidence_id); if (!duplicate) { state.evidence.push(record); if (lesson) registerLesson(state, record, { ...lesson, supporting_evidence_ids: [evidence.evidence_id] }); await writeState(root, state); } return { evidence_id: evidence.evidence_id, duplicate, live_eligible: liveEligible, lesson_id: lesson?.lesson_id ?? null, activation: state.activation };
}
