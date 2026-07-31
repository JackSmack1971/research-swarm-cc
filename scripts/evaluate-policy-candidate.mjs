import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { replayResearchPolicy } from './replay-research-policy.mjs';

const read = async (file) => JSON.parse(await readFile(file, 'utf8'));
const sum = (values) => values.reduce((total, value) => total + value, 0);

export function evaluatePolicyCandidate(input) {
  const replay = replayResearchPolicy(input);
  if (replay.disposition === 'requires_live_canary') return { ...replay, pass: false, improvements: [], degradations: [], evaluator_disagreement: [] };
  const assessors = replay.runs.filter((run) => run.eligible).flatMap((run) => run.assessors.map((assessment) => ({ run_id: run.run_id, ...assessment })));
  const gates = assessors.flatMap((assessment) => assessment.hard_gate_regressions.map((dimension) => ({ run_id: assessment.run_id, evaluator_id: assessment.evaluator_id, dimension })));
  const improved = (deltas) => ['coverage', 'citation_support', 'conflict_disclosure', 'calibration', 'usefulness'].some((dimension) => deltas[dimension] > 0) || ['defects', 'cost', 'verbosity'].some((dimension) => deltas[dimension] < 0);
  const degraded = (deltas) => ['coverage', 'citation_support', 'conflict_disclosure', 'calibration', 'usefulness'].some((dimension) => deltas[dimension] < 0) || ['defects', 'cost', 'verbosity'].some((dimension) => deltas[dimension] > 0);
  const improvements = assessors.filter(({ deltas }) => improved(deltas)).map(({ run_id, evaluator_id, deltas }) => ({ run_id, evaluator_id, deltas }));
  const degradations = assessors.filter(({ deltas }) => degraded(deltas)).map(({ run_id, evaluator_id, deltas }) => ({ run_id, evaluator_id, deltas }));
  const disagreement = replay.runs.filter((run) => run.eligible).flatMap((run) => {
    const directions = run.assessors.map((assessment) => Math.sign(sum(['coverage', 'citation_support', 'conflict_disclosure', 'calibration', 'usefulness'].map((dimension) => assessment.deltas[dimension])) - assessment.deltas.defects));
    return new Set(directions).size > 1 ? [{ run_id: run.run_id, evaluator_ids: run.assessors.map(({ evaluator_id }) => evaluator_id), directions }] : [];
  });
  const eligibleRuns = new Set(assessors.map(({ run_id }) => run_id)).size;
  const improvedRuns = new Set(improvements.map(({ run_id }) => run_id)).size;
  const constitutionCompatible = input.candidate.constitution_version === input.constitution_version;
  const pass = eligibleRuns >= 2 && !gates.length && !assessors.some(({ unsupported_material_claims, provenance_regressed }) => unsupported_material_claims || provenance_regressed) && improvedRuns * 2 > eligibleRuns && constitutionCompatible;
  return { ...replay, pass, eligible_run_count: eligibleRuns, improved_run_count: improvedRuns, hard_gate_regressions: gates, improvements, degradations, evaluator_disagreement: disagreement, cost_change: assessors.map(({ run_id, evaluator_id, deltas }) => ({ run_id, evaluator_id, cost_delta: deltas.cost })), constitution_compatible: constitutionCompatible, required_checks: replay.categories.runtime_or_friction.length ? ['deterministic tests', 'targeted runtime checks'] : [] };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(JSON.stringify(evaluatePolicyCandidate(await read(process.argv[2]))));
