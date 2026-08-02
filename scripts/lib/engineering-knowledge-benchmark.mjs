import { readFile } from 'node:fs/promises';
import { routeUncertainty } from './decision-router.mjs';

const classes = new Set([
  'repository_only_fact', 'current_library_api_question', 'dependency_version_choice',
  'cve_security_exposure', 'migration_breaking_change', 'unfamiliar_integration',
  'cross_file_impact', 'code_docs_config_relationship', 'broad_technology_choice',
  'high_consequence_conflicting_external_evidence'
]);

const researchStages = ['plan', 'research', 'normalize', 'select_verification', 'verify', 'adjudicate', 'synthesize', 'semantic_validation', 'repair', 'persist'];
const repositoryStages = ['project_profile_or_direct_inspection'];

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
