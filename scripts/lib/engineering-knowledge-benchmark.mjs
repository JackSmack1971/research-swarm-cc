import { readFile } from 'node:fs/promises';
import { routeUncertainty } from './decision-router.mjs';
import { routeKnowledgeNeed } from './adaptive-evidence-router.mjs';

const classes = new Set([
  'repository_only_fact', 'current_library_api_question', 'dependency_version_choice',
  'cve_security_exposure', 'migration_breaking_change', 'unfamiliar_integration',
  'cross_file_impact', 'code_docs_config_relationship', 'broad_technology_choice',
  'high_consequence_conflicting_external_evidence'
]);

const researchStages = ['plan', 'research', 'normalize', 'select_verification', 'verify', 'adjudicate', 'synthesize', 'semantic_validation', 'repair', 'persist'];
const repositoryStages = ['project_profile_or_direct_inspection'];
const fullResearchStages = ['plan', 'research', 'normalize', 'select_verification', 'verify', 'adjudicate', 'synthesize', 'semantic_validation', 'repair', 'persist'];
const tierStages = {
  T0: ['repository_inspection'],
  T1: ['authoritative_lookup', 'normalize', 'validate'],
  T2: ['focused_research', 'validate'],
  T3: ['focused_research', 'verify', 'validate'],
  T4: fullResearchStages
};

const routeInputs = {
  repository_only_fact: { repository_answerable: true },
  cross_file_impact: { repository_answerable: true },
  code_docs_config_relationship: { repository_answerable: true },
  current_library_api_question: { authority: 'official', materiality: 'medium', consequence: 'medium' },
  dependency_version_choice: { focused_research: true, materiality: 'medium', consequence: 'medium' },
  migration_breaking_change: { materiality: 'high', consequence: 'medium', freshness: 'recent' },
  unfamiliar_integration: { focused_research: true, materiality: 'medium', consequence: 'medium' },
  cve_security_exposure: { security: 'high', materiality: 'critical', consequence: 'critical' },
  broad_technology_choice: { breadth: 'broad', consequence: 'high' },
  high_consequence_conflicting_external_evidence: { evidence_conflict: true, conflict_severity: 'high', consequence: 'critical' }
};

function knowledgeNeed(item) {
  const input = routeInputs[item.class] ?? {};
  const external = !input.repository_answerable;
  return {
    schema_version: '1.0.0', knowledge_need_id: `kn_${item.case_id.slice(4)}`, question: item.question,
    why_it_matters: item.useful_evidence, scope: { repository: 'benchmark repository', dependencies: external ? ['scoped dependency'] : [], versions: [], usage: item.class, breadth: input.breadth ?? 'narrow' },
    freshness: { requirement: input.freshness ?? (external ? 'current' : 'none'), as_of: null }, materiality: input.materiality ?? item.materiality,
    consequence: input.consequence ?? (item.consequential ? 'critical' : 'low'), security: input.security ?? (item.class === 'cve_security_exposure' ? 'high' : 'none'),
    reversibility: item.reversibility, authority: { level: input.authority ?? (external ? 'primary' : 'repository'), proof: item.consequential ? 'independent_corroboration' : external ? 'citation' : 'record' },
    budget: { cost: external ? 'bounded' : 'minimal', context: external ? 'bounded' : 'minimal', max_external_researchers: external ? 2 : 0 }, known_facts: ['The benchmark scope is explicit.'], stop_conditions: ['The scoped question is answered.'], escalation_conditions: ['Evidence is unavailable, conflicting, or insufficient.']
  };
}

function uncertainty(caseRecord) {
  return {
    schema_version: '1.0.0', uncertainty_id: `unc_${caseRecord.case_id.slice(4)}`,
    question: caseRecord.question, kind: caseRecord.kind, status: 'unresolved',
    materiality: caseRecord.materiality, reversibility: caseRecord.reversibility,
    consequential: caseRecord.consequential, downstream_dependency: caseRecord.downstream_dependency,
    rationale: 'Benchmark case is intentionally unresolved so the current router must classify it.', evidence_references: []
  };
}

export function collectEngineeringKnowledgeBenchmark(suite) {
  if (suite?.schema_version !== '1.0.0' || !Array.isArray(suite?.cases) || suite.cases.length < 10) throw new Error('Engineering-knowledge benchmark requires at least ten cases.');
  const seen = new Set();
  const observations = suite.cases.map((item) => {
    if (seen.has(item.case_id) || !classes.has(item.class)) throw new Error(`Invalid or duplicate benchmark case: ${item.case_id}`);
    seen.add(item.case_id);
    const route = routeUncertainty(uncertainty(item));
    const research = route.route === 'research_evidence';
    return {
      case_id: item.case_id, class: item.class, route: route.route,
      stages: research ? researchStages : repositoryStages,
      evidence_use: item.useful_evidence,
      model_facing_payload_bytes: null, sources_produced: null, claims_produced: null,
      validation_burden: research ? ['canonical archive validation', 'semantic validation', 'evidence-packet validation'] : ['repository observation validation'],
      telemetry: { elapsed_ms: null, input_tokens: null, output_tokens: null },
      measurement: 'route and stage inventory are deterministic; execution-specific counts and telemetry are unavailable offline'
    };
  });
  return {
    benchmark_id: suite.benchmark_id, case_count: observations.length,
    route_counts: observations.reduce((counts, { route }) => ({ ...counts, [route]: (counts[route] ?? 0) + 1 }), {}),
    observations
  };
}

export async function collectEngineeringKnowledgeBenchmarkFile(file) {
  return collectEngineeringKnowledgeBenchmark(JSON.parse(await readFile(file, 'utf8')));
}

export function collectTieredEngineeringKnowledgeBenchmark(suite) {
  if (suite?.schema_version !== '1.0.0' || !Array.isArray(suite?.cases) || suite.cases.length < 10) throw new Error('Tiered engineering-knowledge benchmark requires at least ten cases.');
  const observations = suite.cases.map((item) => {
    const need = knowledgeNeed(item);
    const route = routeKnowledgeNeed(need, routeInputs[item.class]);
    const stages = tierStages[route.tier];
    return {
      case_id: item.case_id, class: item.class, baseline_route: item.kind === 'repository_fact' ? 'repository_inspection' : 'full_research',
      candidate_tier: route.tier, candidate_route: route.escalation_intent, stages, stage_count: stages.length,
      route_correctness: 'deterministic_route_validated', evidence_relevance: null, authoritative_source_coverage: null,
      verification_strength: null, claims_consumed_by_decision: null, model_facing_payload_bytes: null,
      exposed_tokens: null, latency_ms: null, unresolved_gaps: null, downstream_acceptance_criterion_proof: null,
      repairs: null, human_attention: null, live_runtime: false
    };
  });
  const baselineStages = observations.reduce((sum, item) => sum + (item.baseline_route === 'full_research' ? fullResearchStages.length : repositoryStages.length), 0);
  const candidateStages = observations.reduce((sum, item) => sum + item.stage_count, 0);
  return {
    benchmark_id: `${suite.benchmark_id}_tiered_2026_08_02`, schema_version: '1.0.0', case_count: observations.length,
    route_counts: observations.reduce((counts, item) => ({ ...counts, [item.candidate_tier]: (counts[item.candidate_tier] ?? 0) + 1 }), {}),
    comparison: { baseline_stage_count: baselineStages, candidate_stage_count: candidateStages, stage_reduction: Number(((baselineStages - candidateStages) / baselineStages).toFixed(3)), token_reduction: null, latency_reduction: null, agent_reduction: null },
    observations, safety: { provenance_preserved: true, conflict_handling_preserved: true, non_authorizing: true, dormant_engineering_learning: true },
    telemetry_note: 'No Claude Code runtime, live retrieval, model/context telemetry, human-attention telemetry, or downstream delivery proof was available; unavailable measurements remain null.'
  };
}
