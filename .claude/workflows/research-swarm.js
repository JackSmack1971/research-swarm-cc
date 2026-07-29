export const meta = {
  name: "research-swarm",
  description:
    "Run structured, parallel, adversarially verified research and return an auditable cited report"
};

const DEFAULTS = {
  depth: "auto",
  maxWorkers: 8,
  verification: "risk-based",
  freshness: null,
  outputRoot: "artifacts/research-runs"
};

const DEPTHS = new Set(["auto", "light", "standard", "deep"]);
const DEPTH_RANK = { light: 1, standard: 2, deep: 3 };
const VERIFICATION_POLICIES = new Set(["none", "risk-based", "all-material"]);

const string = { type: "string", minLength: 1 };
const stringArray = { type: "array", items: string };
const sourceId = { type: "string", pattern: "^src_[A-Za-z0-9][A-Za-z0-9_-]*$" };
const claimId = { type: "string", pattern: "^clm_[A-Za-z0-9][A-Za-z0-9_-]*$" };
const verificationEventId = { type: "string", pattern: "^ver_[A-Za-z0-9][A-Za-z0-9_-]*$" };
const conflictId = { type: "string", pattern: "^conf_[A-Za-z0-9][A-Za-z0-9_-]*$" };
const reportMapId = { type: "string", pattern: "^rmap_[A-Za-z0-9][A-Za-z0-9_-]*$" };
const reportUnitId = { type: "string", pattern: "^rpt_[A-Za-z0-9][A-Za-z0-9_-]*$" };
const sourceIdArray = { type: "array", items: sourceId };
const claimIdArray = { type: "array", items: claimId };
const sourceSchema = {
  type: "object",
  additionalProperties: false,
  required: ["source_id", "title", "publisher", "publication_date", "source_type", "independence_group", "access_date"],
  properties: {
    source_id: sourceId,
    title: string,
    publisher: string,
    publication_date: { anyOf: [{ type: "string" }, { type: "null" }] },
    publication_date_unavailable_reason: string,
    url: { type: "string" },
    doi: { type: "string" },
    source_type: string,
    independence_group: string,
    access_date: { type: "string" }
  },
  allOf: [
    { anyOf: [{ required: ["url"] }, { required: ["doi"] }] },
    { if: { properties: { publication_date: { type: "null" } }, required: ["publication_date"] }, then: { required: ["publication_date_unavailable_reason"] } }
  ]
};
const evidenceSchema = {
  type: "object",
  additionalProperties: false,
  required: ["source_id", "locator", "relationship"],
  properties: {
    source_id: sourceId,
    locator: string,
    relationship: { enum: ["supports", "contradicts", "qualifies"] },
    note: string
  }
};
const claimSchema = {
  type: "object",
  additionalProperties: false,
  required: ["claim_id", "statement", "scope", "claim_type", "materiality", "confidence", "confidence_rationale", "supporting_evidence", "counter_evidence"],
  properties: {
    claim_id: claimId,
    statement: string,
    scope: string,
    claim_type: { enum: ["fact", "source_assertion", "estimate", "opinion", "inference"] },
    materiality: { enum: ["critical", "high", "medium", "low"] },
    confidence: { enum: ["high", "medium", "low"] },
    confidence_rationale: string,
    supporting_evidence: { type: "array", minItems: 1, items: evidenceSchema },
    counter_evidence: { type: "array", items: evidenceSchema },
    conflicts_with: claimIdArray,
    premise_claim_ids: claimIdArray
  }
};
const conflictSchema = {
  type: "object",
  additionalProperties: false,
  required: ["conflict_id", "claim_ids", "supporting_source_ids", "reason", "practical_implication", "status"],
  properties: {
    conflict_id: conflictId,
    claim_ids: { type: "array", minItems: 2, items: claimId },
    supporting_source_ids: { type: "array", minItems: 1, items: sourceId },
    reason: string,
    practical_implication: string,
    status: { enum: ["unresolved", "qualified", "resolved"] },
    resolution_rationale: string
  }
};
const discardedClaimSchema = {
  ...claimSchema,
  required: [...claimSchema.required, "discard_reason"],
  properties: { ...claimSchema.properties, discard_reason: string }
};
const planSchema = {
  type: "object",
  additionalProperties: false,
  required: ["plan_id", "query", "interpreted_scope", "assumptions", "initial_depth", "depth_rationale", "subquestions", "high_risk_areas", "required_source_types", "escalation_triggers", "worker_count", "verification_policy"],
  properties: {
    plan_id: { type: "string", pattern: "^plan_[A-Za-z0-9][A-Za-z0-9_-]*$" },
    query: string,
    interpreted_scope: string,
    assumptions: stringArray,
    initial_depth: { enum: ["light", "standard", "deep"] },
    depth_rationale: string,
    subquestions: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["subquestion_id", "question"],
        properties: { subquestion_id: string, question: string }
      }
    },
    high_risk_areas: stringArray,
    required_source_types: stringArray,
    escalation_triggers: stringArray,
    worker_count: { type: "integer", minimum: 1, maximum: 8 },
    verification_policy: { enum: ["none", "risk-based", "all-material"] }
  }
};
const claimBundleSchema = {
  type: "object",
  additionalProperties: false,
  required: ["bundle_id", "subquestion_id", "sources", "claims"],
  properties: {
    bundle_id: string,
    subquestion_id: string,
    sources: { type: "array", items: sourceSchema },
    claims: { type: "array", items: claimSchema }
  }
};
const normalizedSchema = {
  type: "object",
  additionalProperties: false,
  required: ["sources", "claims", "conflicts", "coverage_gaps", "verification_targets"],
  properties: {
    sources: { type: "array", items: sourceSchema },
    claims: { type: "array", items: claimSchema },
    conflicts: { type: "array", items: conflictSchema },
    coverage_gaps: stringArray,
    verification_targets: { type: "array", items: string }
  }
};
const verificationEventSchema = {
  type: "object",
  additionalProperties: false,
  required: ["verification_event_id", "claim_id", "occurred_at", "outcome", "rationale", "checked_source_ids"],
  properties: {
    verification_event_id: verificationEventId,
    claim_id: claimId,
    occurred_at: string,
    outcome: { enum: ["confirmed", "confirmed_with_qualification", "demoted", "contradicted", "unverifiable", "discarded"] },
    rationale: string,
    checked_source_ids: sourceIdArray,
    qualification: string
  }
};
const adjudicationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["retained_claims", "discarded_claims", "conflicts", "unresolved_gaps"],
  properties: {
    retained_claims: { type: "array", items: claimSchema },
    discarded_claims: { type: "array", items: discardedClaimSchema },
    conflicts: { type: "array", items: conflictSchema },
    unresolved_gaps: stringArray
  }
};
const reportMapSchema = {
  type: "object",
  additionalProperties: false,
  required: ["report_map_id", "report_units"],
  properties: {
    report_map_id: reportMapId,
    report_units: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["report_unit_id", "section", "claim_ids"],
        properties: {
          report_unit_id: reportUnitId,
          section: string,
          claim_ids: claimIdArray,
          is_inference: { type: "boolean" },
          premise_claim_ids: claimIdArray
        }
      }
    }
  }
};
const synthesisSchema = {
  type: "object",
  additionalProperties: false,
  required: ["report_markdown", "report_map"],
  properties: { report_markdown: string, report_map: reportMapSchema }
};
const semanticValidationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["status", "defects"],
  properties: {
    status: { enum: ["pass", "fail"] },
    defects: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["defect_id", "category", "severity", "report_location", "description", "related_claim_ids", "repair_instruction"],
        properties: {
          defect_id: string,
          category: { enum: ["unsupported_assertion", "missing_citation", "concealed_conflict", "overstatement", "unlabeled_inference", "unsupported_recommendation", "missing_claim_coverage"] },
          severity: { enum: ["critical", "high", "medium", "low"] },
          report_location: string,
          description: string,
          related_claim_ids: stringArray,
          repair_instruction: string
        }
      }
    }
  }
};
const persistenceSchema = {
  type: "object",
  additionalProperties: false,
  required: ["run_directory", "validation_status", "manifest"],
  properties: {
    run_directory: string,
    validation_status: { type: "object", required: ["valid"], properties: { valid: { type: "boolean" } } },
    manifest: { type: "object" }
  }
};

function clampWorkers(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(1, Math.min(8, Math.floor(numeric))) : DEFAULTS.maxWorkers;
}

function parseArguments(value) {
  const input = typeof value === "string" ? { query: value } : value && typeof value === "object" ? value : {};
  const query = typeof input.query === "string" ? input.query.trim() : "";

  if (!query) throw new Error("research-swarm requires a non-empty research query.");

  return {
    query,
    depth: DEPTHS.has(input.depth) ? input.depth : DEFAULTS.depth,
    maxWorkers: clampWorkers(input.maxWorkers ?? DEFAULTS.maxWorkers),
    verification: VERIFICATION_POLICIES.has(input.verification) ? input.verification : DEFAULTS.verification,
    freshness: typeof input.freshness === "string" && input.freshness.trim() ? input.freshness.trim() : DEFAULTS.freshness,
    outputRoot: typeof input.outputRoot === "string" && input.outputRoot.trim() ? input.outputRoot.trim() : DEFAULTS.outputRoot
  };
}

function consolidateSubquestions(subquestions, maximum) {
  if (subquestions.length <= maximum) return subquestions;
  const size = Math.ceil(subquestions.length / maximum);
  return Array.from({ length: Math.ceil(subquestions.length / size) }, (_, index) => {
    const group = subquestions.slice(index * size, (index + 1) * size);
    return group.length === 1
      ? group[0]
      : {
          subquestion_id: `sq_consolidated_${index + 1}`,
          question: group.map(({ question }) => question).join("\n\nAlso address: ")
        };
  });
}

function validatePlan(plan, requestedDepth) {
  if (!DEPTHS.has(plan.initial_depth) || plan.initial_depth === "auto") throw new Error("Planner returned an invalid research depth.");
  if (!VERIFICATION_POLICIES.has(plan.verification_policy)) throw new Error("Planner returned an invalid verification policy.");
  if (!Array.isArray(plan.assumptions) || !Array.isArray(plan.subquestions) || plan.subquestions.length === 0) throw new Error("Planner returned an incomplete research plan.");
  if (!Number.isInteger(plan.worker_count) || plan.worker_count < 1 || plan.worker_count > 8 || plan.worker_count !== plan.subquestions.length) throw new Error("Planner returned an invalid worker count.");
  if (requestedDepth !== "auto" && DEPTH_RANK[plan.initial_depth] < DEPTH_RANK[requestedDepth]) throw new Error("Planner reduced the requested minimum research depth.");
  const ids = plan.subquestions.map(({ subquestion_id }) => subquestion_id);
  if (new Set(ids).size !== ids.length || ids.some((id) => typeof id !== "string" || !id.startsWith("sq_"))) throw new Error("Planner returned duplicate or invalid subquestion IDs.");
}

function selectVerificationTargets(claims, sources, depth, policy) {
  if (policy === "none" && depth !== "deep") return [];
  const sourceGroups = new Map(sources.map(({ source_id, independence_group }) => [source_id, independence_group]));
  return claims
    .filter((claim) => {
      const groups = new Set(claim.supporting_evidence.map(({ source_id }) => sourceGroups.get(source_id) ?? source_id));
      const text = `${claim.statement} ${claim.scope}`.toLowerCase();
      return depth === "deep"
        ? true
        : policy === "all-material"
        ? claim.materiality !== "low"
        : claim.materiality === "critical" || claim.materiality === "high" || claim.confidence === "low" || claim.supporting_evidence.length <= 1 || groups.size <= 1 || claim.counter_evidence.length > 0 || /\d|quant|rate|date|dated|ranking|ranked|threshold|forecast|compar|causal|time-sensitive|temporal|legal|medical|financial|safety|recommend|interested/.test(text);
    })
    .map(({ claim_id }) => claim_id)
    .sort();
}

try {
const config = parseArguments(args);
const plan = await agent(`You are the research planner. Return only JSON matching the supplied schema. Do not research sources or make substantive claims.\n\nOriginal query: ${config.query}\nRequested minimum depth: ${config.depth}\nMaximum workers: ${config.maxWorkers}\nVerification policy: ${config.verification}\nFreshness requirement: ${config.freshness ?? "none"}\n\nInterpret scope without asking questions. Produce a bounded plan with assumptions, unique sq_ subquestion IDs, source types, risk areas, escalation triggers, and a worker count that equals the number of subquestions.`, { label: "plan research", schema: planSchema });

validatePlan(plan, config.depth);
const subquestions = consolidateSubquestions(plan.subquestions, config.maxWorkers);
const boundedPlan = { ...plan, subquestions, worker_count: subquestions.length, verification_policy: config.verification };

const workerBundles = await pipeline(boundedPlan.subquestions, (subquestion) =>
  agent(`You are an isolated research worker. Return only a claim bundle matching the schema. Do not write files, produce a narrative answer, or receive findings from other workers.\n\nOriginal query: ${config.query}\nInterpreted scope: ${boundedPlan.interpreted_scope}\nAssigned subquestion: ${subquestion.question}\nRequired source types: ${boundedPlan.required_source_types.join(", ")}\nFreshness requirement: ${config.freshness ?? "none"}\nShared evidence standards: use authoritative sources where possible; record source provenance, independence groups, precise locators, scoped falsifiable claims, confidence rationale, and credible counter-evidence. A URL or search snippet alone is not evidence.`, { label: subquestion.subquestion_id, schema: claimBundleSchema })
);

const normalized = await agent(`You are the research normalizer. Return only JSON matching the schema. Do not research, write files, resolve conflicts by majority vote, or synthesize an answer. Canonicalize source and claim IDs, retain scope distinctions and counter-evidence, identify conflicts and coverage gaps, and recommend claim IDs for risk-based verification.\n\nResearch plan:\n${JSON.stringify(boundedPlan)}\n\nWorker claim bundles:\n${JSON.stringify(workerBundles)}`, { label: "normalize evidence", schema: normalizedSchema });

const knownClaimIds = new Set(normalized.claims.map(({ claim_id }) => claim_id));
const selectedVerificationTargets = [...new Set([
  ...selectVerificationTargets(normalized.claims, normalized.sources, boundedPlan.initial_depth, config.verification),
  ...(config.verification === "none" && boundedPlan.initial_depth !== "deep"
    ? []
    : normalized.verification_targets.filter((claimId) => knownClaimIds.has(claimId)))
])].sort();
const deepFallbackTargets = boundedPlan.initial_depth === "deep" && selectedVerificationTargets.length === 0
  ? normalized.claims.map(({ claim_id }) => claim_id).sort()
  : [];
const verificationTargets = [...new Set([...selectedVerificationTargets, ...deepFallbackTargets])];
const claimsById = new Map(normalized.claims.map((claim) => [claim.claim_id, claim]));
const verificationEvents = await pipeline(verificationTargets, (claimId) => {
  const claim = claimsById.get(claimId);
  const sourceIds = new Set([...claim.supporting_evidence, ...claim.counter_evidence].map(({ source_id }) => source_id));
  const citedSources = normalized.sources.filter(({ source_id }) => sourceIds.has(source_id));
  return agent(`You are an adversarial research verifier. Return only one verification event matching the schema. Do not write files or modify shared state. Attempt refutation before confirmation; test source independence, scope, dates, units, denominators, causal attribution, and applicability. Use unverifiable for unavailable or insufficient evidence, never contradicted.\n\nClaim:\n${JSON.stringify(claim)}\n\nCited sources:\n${JSON.stringify(citedSources)}`, { label: `verify ${claimId}`, schema: verificationEventSchema });
});

const adjudicated = await agent(`You are the research adjudicator. Return only JSON matching the schema. Apply every verification event, retain material counter-evidence and unresolved conflicts, and discard claims with failed provenance or ineligible support. Do not research, write files, or introduce evidence.\n\nSources:\n${JSON.stringify(normalized.sources)}\n\nClaims:\n${JSON.stringify(normalized.claims)}\n\nConflicts:\n${JSON.stringify(normalized.conflicts)}\n\nVerification events:\n${JSON.stringify(verificationEvents)}`, { label: "adjudicate evidence", schema: adjudicationSchema });

let draft = await agent(`You are the research synthesizer. Return only a report and report map matching the schema. Use only the adjudicated ledger; every material assertion must map to retained claims. Include unresolved material conflicts and gaps, label inferences with premise IDs, and do not write files.\n\nPlan:\n${JSON.stringify(boundedPlan)}\n\nSources:\n${JSON.stringify(normalized.sources)}\n\nRetained claims:\n${JSON.stringify(adjudicated.retained_claims)}\n\nConflicts:\n${JSON.stringify(adjudicated.conflicts)}\n\nGaps:\n${JSON.stringify(adjudicated.unresolved_gaps)}`, { label: "synthesize report", schema: synthesisSchema });

const reviewDraft = (candidate) => agent(`You are the semantic research validator. Return only JSON matching the schema. Check the draft solely against the adjudicated ledger and report map for unsupported assertions, concealed conflicts, overstatement, unlabeled inferences, unsupported recommendations, and missing coverage. Do not write files or perform structural validation.\n\nDraft report:\n${candidate.report_markdown}\n\nReport map:\n${JSON.stringify(candidate.report_map)}\n\nRetained claims:\n${JSON.stringify(adjudicated.retained_claims)}\n\nConflicts:\n${JSON.stringify(adjudicated.conflicts)}`, { label: "validate report semantics", schema: semanticValidationSchema });

let semanticValidation = await reviewDraft(draft);
let repairRounds = 0;
while (semanticValidation.status === "fail" && repairRounds < 2) {
  repairRounds += 1;
  draft = await agent(`You are the research synthesizer performing targeted repair round ${repairRounds} of 2. Return only a corrected full report and report map matching the schema. Repair only the reported defects: remove unsupported prose, narrow scope, demote language, label uncertainty or inferences, restore a conflict, or regenerate affected sections. Do not research, alter the ledger, invent evidence, or rerun the swarm.\n\nCurrent draft:\n${draft.report_markdown}\n\nCurrent report map:\n${JSON.stringify(draft.report_map)}\n\nSemantic defects:\n${JSON.stringify(semanticValidation.defects)}\n\nRetained claims:\n${JSON.stringify(adjudicated.retained_claims)}\n\nConflicts:\n${JSON.stringify(adjudicated.conflicts)}\n\nGaps:\n${JSON.stringify(adjudicated.unresolved_gaps)}`, { label: `repair report ${repairRounds}`, schema: synthesisSchema });
  semanticValidation = await reviewDraft(draft);
}

const retainedClaimIds = new Set(adjudicated.retained_claims.map(({ claim_id }) => claim_id));
const retainedVerificationEvents = verificationEvents.filter(({ claim_id }) => retainedClaimIds.has(claim_id));
const persistence = await agent(`You are the sole research persistence writer. Return only JSON matching the schema. Create exactly one archived run under ${config.outputRoot}; no other role may write shared artifacts. Write manifest.json, plan.json, sources.jsonl, claims.jsonl, discarded-claims.jsonl, verification-events.jsonl, conflicts.json, report.md, report-map.json, and validation.json. Run node scripts/validate-research-run.mjs on the run directory, write its machine-readable result to validation.json, and rerun it if needed after writing the result so validation.json agrees with the final structural result. Preserve failures for inspection. You may repair serialization or formatting only; never change evidence, claims, verification outcomes, conflicts, conclusions, mappings, or semantic-validation meaning.\n\nPlan:\n${JSON.stringify(boundedPlan)}\n\nSources:\n${JSON.stringify(normalized.sources)}\n\nRetained claims:\n${JSON.stringify(adjudicated.retained_claims)}\n\nDiscarded claims:\n${JSON.stringify(adjudicated.discarded_claims)}\n\nVerification events for retained claims:\n${JSON.stringify(retainedVerificationEvents)}\n\nConflicts:\n${JSON.stringify(adjudicated.conflicts)}\n\nReport:\n${draft.report_markdown}\n\nReport map:\n${JSON.stringify(draft.report_map)}\n\nSemantic validation:\n${JSON.stringify(semanticValidation)}\n\nRepair rounds: ${repairRounds}`, { label: "persist research run", schema: persistenceSchema });

const succeeded = persistence.validation_status.valid && semanticValidation.status === "pass";
return {
  report: succeeded
    ? draft.report_markdown
    : "# Research Swarm Validation Failure\n\nThe run was archived for audit but could not be reported as successful.\n",
  run_directory: persistence.run_directory
};
} catch (cause) {
  return {
    report: "# Research Swarm Failure\n\nThe workflow stopped before it could produce a validated report.",
    run_directory: null
  };
}
