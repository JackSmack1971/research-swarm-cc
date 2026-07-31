import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { blindedOrder, classifyPolicyChanges, compareMetrics } from './lib/research-quality-metrics.mjs';

const read = async (file) => JSON.parse(await readFile(file, 'utf8'));

export function replayResearchPolicy(input) {
  const candidate = input?.candidate;
  if (!candidate?.baseline_policy_snapshot_id) throw new Error('candidate baseline_policy_snapshot_id is required.');
  const categories = classifyPolicyChanges(candidate.change_categories);
  const runs = Array.isArray(input?.runs) ? input.runs : [];
  if (categories.retrieval_affecting.length) return { method: 'replay', outcome: 'inconclusive', disposition: 'requires_live_canary', reason: 'Retrieval-affecting changes cannot be replay-proven from a fixed ledger.', categories, runs: [] };
  const evaluations = [];
  for (const run of runs) {
    if (run.archive_schema_version !== '2.0.0') { evaluations.push({ run_id: run.run_id, eligible: false, reason: 'unsupported_archive_version' }); continue; }
    if (run.policy_snapshot_id !== candidate.baseline_policy_snapshot_id) { evaluations.push({ run_id: run.run_id, eligible: false, reason: 'missing_baseline_policy' }); continue; }
    if (!run.ledger_preserved) { evaluations.push({ run_id: run.run_id, eligible: false, reason: 'ledger_not_preserved' }); continue; }
    const assessors = blindedOrder(run.evaluators || []).map((assessment) => ({ evaluator_id: assessment.evaluator_id, ...compareMetrics(assessment.baseline, assessment.candidate) }));
    evaluations.push({ run_id: run.run_id, eligible: true, assessors, ledger_preserved: true });
  }
  return { method: 'replay', outcome: 'completed', disposition: 'offline_evidence_only', reason: 'Fixed-ledger replay evaluates post-retrieval output only; it does not establish retrieval improvement.', categories, runs: evaluations };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(JSON.stringify(replayResearchPolicy(await read(process.argv[2]))));
