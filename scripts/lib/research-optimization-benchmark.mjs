import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { readJsonl } from './jsonl.mjs';
import { limitsFor } from './research-controls.mjs';
import { validateResearchRun } from './research-validation.mjs';

const DEPTHS = new Set(['light', 'standard', 'deep']);
const resolved = (value, name) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) throw new Error(`${name} must be a non-negative integer.`);
  return number;
};

export function predictAgentPath({ requestedDepth, effectiveDepth = requestedDepth, initialWorkerCount, gapFillWorkerCount = 0, verificationTargetCount = 0, admittedClaimCount = 0, repairAgentCount = 0, evaluatorAgentCount = 0, learningMode = 'off' }) {
  if (!DEPTHS.has(requestedDepth) || !DEPTHS.has(effectiveDepth)) throw new Error('requestedDepth and effectiveDepth must be light, standard, or deep.');
  if (!['off', 'evaluate', 'adapt'].includes(learningMode)) throw new Error('learningMode must be off, evaluate, or adapt.');
  const initial_workers = initialWorkerCount === undefined ? limitsFor(effectiveDepth).maxWorkers : resolved(initialWorkerCount, 'initialWorkerCount');
  const gap_fill_workers = resolved(gapFillWorkerCount, 'gapFillWorkerCount');
  const verification_agents = resolved(verificationTargetCount, 'verificationTargetCount');
  const admitted_claims = resolved(admittedClaimCount, 'admittedClaimCount');
  if (effectiveDepth === 'deep' && verification_agents < admitted_claims) throw new Error('Deep verification agents must cover every admitted claim.');
  const stages = {
    policy: learningMode === 'adapt' ? 2 : 0,
    planning: 1,
    initial_workers,
    gap_fill_workers,
    normalization: 3 + (gap_fill_workers ? 1 : 0),
    verification_agents,
    adjudication: 2,
    synthesis: 1,
    semantic_validation: 1,
    repair_agents: resolved(repairAgentCount, 'repairAgentCount'),
    evaluator_agents: resolved(evaluatorAgentCount, 'evaluatorAgentCount'),
    persistence: 1
  };
  return { requested_depth: requestedDepth, effective_depth: effectiveDepth, ...stages, total_workflow_agents: Object.values(stages).reduce((sum, count) => sum + count, 0) };
}

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const countUnresolved = (records) => records.filter((record) => !['resolved', 'accepted'].includes(record.status)).length;

export async function collectArchiveBenchmark(directory) {
  const [plan, manifest, semantic, validation, sources, claims, discarded, verification, conflicts, gaps, repairs, quality, policy, archiveValidation] = await Promise.all([
    readJson(path.join(directory, 'plan.json')), readJson(path.join(directory, 'manifest.json')), readJson(path.join(directory, 'semantic-validation.json')), readJson(path.join(directory, 'validation.json')),
    readJsonl(path.join(directory, 'sources.jsonl')), readJsonl(path.join(directory, 'claims.jsonl')), readJsonl(path.join(directory, 'discarded-claims.jsonl')), readJsonl(path.join(directory, 'verification-events.jsonl')), readJson(path.join(directory, 'conflicts.json')), readJson(path.join(directory, 'coverage-gaps.json')), readJsonl(path.join(directory, 'repair-events.jsonl')), readJson(path.join(directory, 'run-quality-evaluation.json')), readJson(path.join(directory, 'policy-snapshot.json')), validateResearchRun(directory)
  ]);
  const parseErrors = [sources, claims, discarded, verification, repairs].flatMap(({ errors }) => errors);
  const modelEvaluatorCount = quality.evaluator_identities.filter((identity) => identity.startsWith('research-')).length;
  return {
    run_directory: directory,
    archive_schema_version: manifest.archive_schema_version,
    automatically_collectible: {
      requested_depth: null,
      effective_depth: plan.effective_depth ?? plan.initial_depth,
      initial_worker_count: plan.worker_count,
      gap_fill_workers: null,
      verification_target_count: null,
      verification_agent_count: verification.records.length,
      repair_agent_count: repairs.records.reduce((sum, event) => sum + event.agent_count, 0),
      evaluator_agent_count: modelEvaluatorCount,
      total_workflow_agents: null,
      sources: sources.records.length,
      admitted_claims: claims.records.length,
      retained_claims: manifest.counts.retained_claims,
      discarded_claims: discarded.records.length,
      unresolved_coverage_gaps: countUnresolved(gaps),
      unresolved_conflicts: countUnresolved(conflicts),
      semantic_validation_result: semantic.status,
      deterministic_archive_validation_result: archiveValidation.valid,
      archive_validation_recorded_result: validation.valid,
      parse_errors: parseErrors.length
    },
    archive_context: { verification_policy: plan.effective_verification_policy ?? plan.verification_policy, learning_mode: policy.learning_mode ?? null, quality_disposition: quality.overall_disposition },
    manual_workflows_telemetry: ['requested_depth', 'gap_fill_workers', 'verification_target_count', 'total_workflow_agents', 'elapsed_time', 'per_phase_token_totals', 'per_agent_token_totals']
  };
}
