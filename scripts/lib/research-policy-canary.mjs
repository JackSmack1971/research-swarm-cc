import { createHash } from 'node:crypto';

const STATES = new Set(['proposed', 'replay_passed', 'canary', 'promoted', 'rejected', 'rolled_back']);
const hash = (value) => createHash('sha256').update(value).digest('hex');
const at = (value) => new Date(value).getTime();
const copy = (value) => JSON.parse(JSON.stringify(value));

export function eligibleForCanary(candidate, now = new Date().toISOString()) {
  const categories = new Set(candidate.change_categories || []);
  const replayRequired = [...categories].some((item) => ['synthesis', 'citation', 'calibration', 'adjudication', 'report_structure'].includes(item));
  const runtimeRequired = [...categories].some((item) => ['permissions', 'resource_limits', 'serialization'].includes(item));
  return candidate?.constitution_compatible === true && candidate.risk === 'low' && candidate.active_lesson_evidence_count >= 1
    && !candidate.unresolved_conflicting_lesson_ids?.length && candidate.bounded_directive === true
    && candidate.rollback_snapshot && candidate.rollback_snapshot.policy_bundle
    && (!replayRequired || candidate.replay_passed === true) && (!runtimeRequired || candidate.targeted_execution_passed === true)
    && (!candidate.cooldown_until || at(candidate.cooldown_until) <= at(now));
}

export function assignCanary(candidates, runId, now = new Date().toISOString()) {
  const eligible = candidates.filter((candidate) => candidate.status === 'canary' && eligibleForCanary(candidate, now)).sort((a, b) => a.improvement_candidate_id.localeCompare(b.improvement_candidate_id));
  if (!eligible.length) return { policy: 'baseline', run_id: runId };
  const candidate = eligible[Number.parseInt(hash(`${runId}:${eligible.map((item) => item.improvement_candidate_id).join(',')}`).slice(0, 8), 16) % eligible.length];
  return { policy: 'candidate', run_id: runId, improvement_candidate_id: candidate.improvement_candidate_id, policy_snapshot_id: candidate.policy_snapshot_id };
}

export function assignAndRecordCanary(state, runId, now = new Date().toISOString()) {
  const assignment = { ...assignCanary(state.candidates || [], runId, now), assigned_at: now };
  return { ...state, canary_assignments: [...(state.canary_assignments || []).filter((item) => item.run_id !== runId), assignment] };
}

const criticalCause = (outcome) => outcome.critical_provenance_regression || outcome.critical_security_regression || outcome.unsupported_high_materiality_conclusion || outcome.validator_failure_attributable || outcome.policy_budget_breach || outcome.constitution_incompatible || outcome.user_correction_harm;
const qualityWin = (outcome) => outcome.completed === true && outcome.malformed !== true && outcome.quality === 'improved' && !outcome.high_severity_regression;

export function advanceCandidate(candidate, outcomes = [], now = new Date().toISOString()) {
  const next = copy(candidate);
  if (!STATES.has(next.status)) throw new Error(`Unknown candidate state: ${next.status}.`);
  if (!next.rollback_snapshot?.policy_bundle || next.rollback_snapshot.policy_snapshot_id !== next.baseline_policy_snapshot_id) return { ...next, status: 'rejected', rejection_reason: 'rollback_snapshot_corrupt' };
  if (next.status === 'proposed') {
    if (!eligibleForCanary(next, now)) return next;
    next.status = next.replay_passed ? 'replay_passed' : 'canary';
    if (next.status === 'replay_passed') next.status = 'canary';
  }
  if (next.status !== 'canary') return next;
  const own = outcomes.filter((outcome) => outcome.improvement_candidate_id === next.improvement_candidate_id && outcome.policy_used === 'candidate');
  const critical = own.find(criticalCause);
  if (critical) return rollback(next, own, critical, now);
  const ordered = [...own].sort((a, b) => String(a.run_id).localeCompare(String(b.run_id)));
  let consecutive = 0;
  for (const outcome of ordered) { consecutive = outcome.high_severity_regression ? consecutive + 1 : 0; if (consecutive >= 2) return rollback(next, own, outcome, now); }
  const wins = new Set(own.filter(qualityWin).map((outcome) => outcome.run_id));
  if (wins.size >= 3) next.status = 'promoted';
  return next;
}

function rollback(candidate, outcomes, cause, now) {
  if (!candidate.rollback_snapshot?.policy_bundle || candidate.rollback_snapshot.policy_snapshot_id !== candidate.baseline_policy_snapshot_id) return { ...candidate, status: 'rejected', rejection_reason: 'rollback_snapshot_corrupt' };
  return { ...candidate, status: 'rolled_back', rollback: { occurred_at: now, cause: cause.run_id || 'candidate_safety_gate', affected_run_ids: [...new Set(outcomes.map((item) => item.run_id).filter(Boolean))].sort(), restored_policy_snapshot: copy(candidate.rollback_snapshot) }, cooldown_until: new Date(at(now) + 7 * 86400000).toISOString() };
}

export function advanceCandidates(state, outcomes = [], now = new Date().toISOString()) {
  const candidates = (state.candidates || []).map((candidate) => advanceCandidate(candidate, outcomes, now));
  const promoted = candidates.find((candidate) => candidate.status === 'promoted');
  return { ...state, candidates, generatedPolicy: promoted ? copy(promoted.candidate_policy_bundle) : state.generatedPolicy };
}
