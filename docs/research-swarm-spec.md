# Claude Code Deep Research Swarm — Implementation Specification

## 1. Your role

You are acting only as a repository implementation agent.

Build the files for a customized **Claude Code Deep Research Swarm**. The resulting system will run inside Claude Code. Do not create an OpenAI agent, Codex workflow, OpenAI API integration, or separate application.

Your responsibilities are limited to:

* inspecting the existing repository;
* creating and updating Claude Code configuration files;
* writing the Claude Code dynamic workflow;
* writing custom Claude Code agent definitions;
* writing research contracts and schemas;
* writing deterministic validation scripts;
* writing tests and documentation;
* verifying that the created files are internally consistent.

Do not execute live research as part of this build.

Do not add an external orchestration framework.

Do not overwrite existing project configuration blindly. Merge changes carefully.

---

# 2. Objective

Create a reusable Claude Code command:

```text
/research-swarm <research question>
```

The command must run a structured research workflow with these stages:

1. classify the required research depth;
2. decompose the question;
3. run isolated research workers in parallel;
4. normalize and deduplicate their findings;
5. select claims for risk-based adversarial verification;
6. verify selected claims in parallel;
7. adjudicate conflicts;
8. synthesize a cited report;
9. validate that the report is supported by the claim ledger;
10. persist an auditable research run.

The workflow must return only the final report and the path to its archived run directory.

---

# 3. Architectural rules

Follow these rules throughout the implementation.

Milestone 55 adds separate canonical risk-classification and execution-authorization records. They bind an accepted current Change Contract, current task graph/capsule, and profiled base; classify security, privacy, integrity, migrations, external APIs, high consequence, UI/accessibility, infrastructure, dependencies, blast radius, and reversibility before implementation; and fail closed on relevant drift or unresolved uncertainty. They record proportional autonomy, human boundaries, proof, verification, isolation, and tool posture. Evidence, graph inferences, and prototype artifacts remain non-authoritative. Authorization never merges, deploys, or implements work; the executor remains a later milestone.

## 3.1 Runtime boundary

The runtime target is Claude Code.

Codex is only creating files.

Do not add:

* OpenAI SDK dependencies;
* Codex SDK dependencies;
* LangChain;
* CrewAI;
* AutoGen;
* Temporal;
* a database;
* a web server;
* a background service;
* GitHub Issues as the active blackboard.

## 3.2 Orchestration

Use a JavaScript dynamic workflow, running entirely inside Claude Code, as the actual orchestrator.

Do not create an “orchestrator agent” that manually decides every transition. The JavaScript workflow owns:

* branching;
* worker fan-out;
* verification selection;
* retry limits;
* repair loops;
* aggregation;
* final return value.

Custom agents define reusable roles, but the workflow script owns control flow.

Claude Code 2.1.154 and later documents this native workflow interface. Milestone 2 must still confirm it is enabled locally and must verify the remaining unresolved routing question: whether a workflow `agent()` call can directly select a named project agent from `.claude/agents/`. Do not substitute an external runtime.

## 3.3 Shared state

Intermediate workflow state should remain in workflow variables.

Persist state only after the research and verification phases have produced a coherent ledger.

Only one persistence agent may write the final run artifacts. Research workers and verifiers must not concurrently mutate shared files.

## 3.4 Enforcement

Prompt instructions alone are not hard enforcement.

Use all three layers:

1. agent and skill instructions;
2. structured output schemas in workflow agent calls;
3. deterministic Node.js validation scripts.

## 3.5 Dependencies

Use Node.js built-in modules only, except that Milestones 12–20 authorize Ajv 8 as the sole new dependency for JSON Schema contract enforcement. Ajv is not an orchestration dependency.

Do not add any other npm dependency unless the repository already has an approved validation dependency that can be reused without changing application behavior.

Use the built-in `node:test` test runner.

## 3.6 Engineering-system boundary

This specification remains authoritative for the research workflow and archive contracts. The engineering system's truth planes, typed evidence-to-delivery boundaries, ownership, rigor/autonomy, drift, and Claude Code mechanism decisions are authoritative in [the Engineering Constitution](engineering-constitution.md). The existing Dynamic Workflow remains a bounded non-interactive research DAG; it is not an engineering executor or a general engineering Dynamic Workflow.

Milestone 48's project-profile contract is an engineering derived-state input, not a research archive contract or workflow input. Its Node/Ajv implementation may inspect an explicit target repository read-only, but it must not change research schemas, generate a permanent repository map, or elevate optional code-intelligence results into canonical evidence or authorization.

Milestone 50's engineering evidence packet is a derived, scoped export of an already valid research archive, not a research workflow input or archive migration. It must preserve run/version/hash provenance and exclude raw webpages, agent transcripts, report prose, discarded claims, and unrelated context. It may inform an explicit engineering decision only; it must not create a decision, requirement, authorization, or task, and research is never a universal engineering prerequisite.

Milestone 51's engineering uncertainty and decision records are separate canonical contracts outside research archives. The Decision Router sends resolved/reversible details to no further inquiry, repository facts to inspection, material external facts to Research Swarm/evidence packets, experiential/UX/state/architecture questions to a prototype, normative/preference/policy/high-irreversibility/consequential decisions to a human, and reversible low-risk implementation choices to an agent. It never executes production work.

Milestone 52's change contract is separate canonical Intent-plane state outside research archives. It preserves decisions, authorized requirements, observable acceptance criteria, constraints, non-goals, risks, unresolved uncertainty, base repository identity/revision/fingerprint, and any traceable delta from a prior contract. Markdown is a deterministic view only. An accepted contract cannot retain execution-relevant unresolved uncertainty, and acceptance is not execution authorization; task planning and execution remain later milestones.

Milestone 53's prototype lane is separate canonical experiment evidence outside research archives. A record links one draft-contract uncertainty to a hypothesis/variants, exact base revision, disposable isolated worktree, bounded local instructions, observations, accepted/rejected/inconclusive verdict, resulting decision references, artifact identities, and disposal state. Required experiential prototype uncertainty keeps a contract draft. The record never authorizes execution or direct promotion of prototype code; a separate explicit decision may use its finding, after which the existing validated contract path applies. It adds no production executor, workflow, service, or generic prototype swarm.

Milestone 56's engineering benchmark is a separate, deterministic delivery-evidence harness. It defines safe disposable brownfield task fixtures and records only observed task outcomes, raw runtime evidence, nullable exposed telemetry, human attention, regressions, complexity, and risk-gate results. A comparator may report aligned-suite deltas and new safety regressions but cannot choose a winner, authorize a task, or establish executor value. Plain-Claude baseline sessions disable repository customizations and run only in disposable fixtures; missing telemetry remains missing.

Milestone 57's executor accepts only a current deterministic authorization and its task capsule, rechecks drift immediately before creating an isolated Git worktree, and returns immutable execution events. Events record the base revision, task, worktree, invoked commands, changed files, stop/scope outcomes, and resulting diff identity without storing hidden reasoning. It rejects planning-state paths and anchor escape, prohibits nested delegation, force operations, merge, push, deployment, and production side effects, and labels every successful result `unverified_implementation` until Milestone 58 independently verifies it.

Milestone 58 adds a separate fresh-context verifier which receives the accepted criterion/capsule, authorization posture, executor event, current changed worktree, and change identity, never executor reasoning. It emits append-only verification events and one terminal proof record per criterion. A proof may be `proven`, `failed`, `blocked`, or `unverifiable`; a `proven` criterion must contain every declared proof kind, so command evidence cannot satisfy a runtime, browser, API, LSP, or security requirement. Verification may request at most two identified-defect repairs, each followed by new fresh-context verification. It neither alters the executor event's `unverified_implementation` status nor merges or deploys.

Milestone 59 adds a derived Delivery-plane manifest and deterministic handoff renderer. The manifest references—not duplicates—the accepted contract, project profile, graph, capsule, authorization, immutable execution event, verification events, and criterion proofs by path and digest; it records their linked identities, terminal criterion status, unresolved risks, repair history, integration state, and next authorized action. Missing, mismatched, or drifted references fail closed and require regeneration/re-authorization. The rendered handoff is not canonical state, an authorization, a promotion, or a conversation replay; it neither executes, commits, pushes, merges, nor deploys.

Milestone 54's task graph and context capsules are derived Delivery-plane planning records outside research archives. A deterministic compiler accepts only a valid accepted Change Contract at its exact profiled base, validates criterion lineage, dependencies, collision and migration ordering, and emits disposable task-local capsules. It does not infer decisions, authorize execution, execute work, or make optional Graphify data mandatory.

---

# 4. Required directory structure

Create or merge the following structure:

```text
.claude/
├── agents/
│   ├── research-planner.md
│   ├── research-worker.md
│   ├── research-normalizer.md
│   ├── research-verifier.md
│   ├── research-adjudicator.md
│   ├── research-semantic-validator.md
│   ├── research-synthesizer.md
│   └── research-persistence-writer.md
├── rules/
│   └── deep-research.md
├── skills/
│   └── research-standards/
│       └── SKILL.md
├── workflows/
│   └── research-swarm.js
└── settings.json

research/
├── README.md
├── schemas/
│   ├── research-plan.schema.json
│   ├── source.schema.json
│   ├── claim.schema.json
│   ├── claim-bundle.schema.json
│   ├── verification-event.schema.json
│   ├── report-map.schema.json
│   └── run-manifest.schema.json
└── templates/
    └── canonical-report.md

scripts/
├── validate-research-run.mjs
└── lib/
    ├── jsonl.mjs
    └── research-validation.mjs

tests/
├── research-validation.test.mjs
└── fixtures/
    ├── valid-run/
    ├── invalid-missing-source/
    ├── invalid-unknown-claim/
    └── invalid-confidence/

artifacts/
└── research-runs/
    └── .gitkeep
```

Also update the project’s root `CLAUDE.md` only when one exists or when project conventions indicate it should be created.

Add a small marked section pointing Claude to:

* `.claude/rules/deep-research.md`;
* the `/research-swarm` command;
* `research/README.md`.

Do not duplicate the full research rules in `CLAUDE.md`.

---

# 5. Project rule

Create `.claude/rules/deep-research.md`.

It must establish these invariants:

## Evidence

* Every externally verifiable material claim must reference at least one source ID.
* Every source must include title, publisher or responsible organization, publication date when available, URL or DOI, source type, and access date.
* Evidence must include a locator such as a section, heading, page, table, paragraph description, timestamp, or repository path.
* Missing provenance makes a claim ineligible for the final report.
* A URL alone is not evidence.
* Workers must distinguish facts, source assertions, estimates, opinions, and inferences.

## Source hierarchy

Prefer, in order:

1. primary data and original research;
2. official documentation, laws, standards, filings, and public records;
3. high-quality independent secondary analysis;
4. expert commentary;
5. general commentary or opinion.

Do not treat multiple articles derived from the same press release or dataset as independent confirmation.

## Conflicts

* Conflicting credible evidence must remain visible.
* A conflict must identify the competing claims, supporting source IDs, likely reason for disagreement, and practical implication.
* Lack of agreement must not be converted into false certainty.

## Roles

* Planners do not research claims.
* Workers extract evidence but do not write narrative reports.
* Normalizers deduplicate and structure claims but do not silently resolve conflicts.
* Verifiers actively attempt refutation.
* Synthesizers may not introduce unsupported externally verifiable propositions.
* Persistence writers may write files but may not alter research conclusions.

## Synthesis

* Every key report finding must map to retained claim IDs.
* Derived conclusions must be labeled as inferences and identify their supporting claim IDs.
* The final report must distinguish established findings, qualified findings, unresolved conflicts, gaps, and recommendations.
* Unsupported claims must be removed rather than rewritten to sound plausible.

## Repair limits

* Validation failure may trigger no more than two targeted repair rounds.
* A repair round may correct, demote, remove, or re-research a claim.
* It must not invent evidence.
* If validation still fails, return a transparent failure report and preserve the incomplete run for inspection.

---

# 6. Shared research standards skill

Create `.claude/skills/research-standards/SKILL.md`.

Use frontmatter appropriate for a non-user-facing knowledge skill:

```yaml
---
name: research-standards
description: Shared evidence, claim, verification, and report standards for the research swarm
user-invocable: false
---
```

Do not set `disable-model-invocation: true`, because the skill must be preloadable by custom agents.

The skill must define:

* the canonical claim model;
* the source hierarchy;
* confidence criteria;
* source independence;
* materiality levels;
* verification selection rules;
* conflict handling;
* acceptable inference;
* the canonical report structure;
* prohibited behavior.

## Confidence rubric

Use these meanings:

### High

Use only when the evidence is direct and strong, and either:

* at least two genuinely independent authoritative source groups support it; or
* one definitive primary authority supports it and the reason that one source is sufficient is explicitly recorded.

### Medium

Use when evidence is credible but has an important limitation, such as:

* only one non-definitive source;
* incomplete independent confirmation;
* methodological uncertainty;
* limited scope;
* possible staleness;
* unresolved but non-fatal counter-evidence.

### Low

Use when evidence is provisional, indirect, disputed, old, weakly scoped, or primarily interpretive.

The final report may include a low-confidence claim only when it is clearly labeled and materially useful.

## Materiality levels

Use:

* `critical`;
* `high`;
* `medium`;
* `low`.

Materiality concerns the consequence of a claim being wrong, not how interesting it is.

## Source independence

Require an `independence_group` field.

Sources that repeat the same underlying study, filing, announcement, press release, interview, or dataset must share an independence group.

---

# 7. Custom agents

All custom agent files must:

* use YAML frontmatter;
* use `model: inherit`;
* preload the `research-standards` skill where applicable;
* have explicit tool restrictions;
* prohibit spawning additional agents unless that role genuinely requires it;
* return structured data rather than conversational filler;
* avoid writing shared artifacts unless the role is the persistence writer.

Do not guess undocumented frontmatter fields.

## 7.1 Research planner

File:

```text
.claude/agents/research-planner.md
```

Responsibilities:

* accept the original question and optional configuration;
* determine initial depth;
* produce a bounded research plan;
* identify ambiguity without asking the user during the workflow;
* state assumptions;
* define subquestions;
* define likely source classes;
* identify high-risk claim categories;
* set escalation triggers.

It must never search for sources or make substantive research claims.

Its output contract must include:

```text
query
interpreted_scope
assumptions[]
initial_depth
depth_rationale
subquestions[]
high_risk_areas[]
required_source_types[]
escalation_triggers[]
worker_count
verification_policy
```

## 7.2 Research worker

File:

```text
.claude/agents/research-worker.md
```

Allowed capabilities should include web research and read-only repository inspection where available.

Do not grant `Write` or `Edit`.

Responsibilities:

* receive exactly one subquestion;
* produce focused search queries;
* prioritize primary and authoritative sources;
* extract falsifiable claims;
* extract quantitative evidence with units and scope;
* record methodological limitations;
* record supporting and contradicting evidence;
* record short direct quotations only when necessary;
* return a structured claim bundle.

Prohibit:

* answering the original user question;
* producing a polished narrative;
* assigning high confidence merely because several sources agree;
* treating search-result snippets as evidence;
* fabricating dates or publication details;
* silently dropping credible contradictions.

## 7.3 Research normalizer

File:

```text
.claude/agents/research-normalizer.md
```

Responsibilities:

* combine worker bundles;
* deduplicate sources;
* assign canonical source IDs;
* assign canonical claim IDs;
* merge equivalent claims without destroying scope differences;
* identify conflicting claims;
* classify materiality;
* identify independence groups;
* recommend verification targets.

It must not resolve a factual conflict merely by majority vote.

## 7.4 Research verifier

File:

```text
.claude/agents/research-verifier.md
```

Do not grant `Write` or `Edit`.

Responsibilities:

* receive one claim and its supporting evidence;
* attempt to refute or materially qualify it;
* seek independent sources;
* inspect whether supporting sources share the same origin;
* challenge scope, dates, denominators, causality, and interpretation;
* return a verification event.

Valid outcomes:

```text
confirmed
confirmed_with_qualification
demoted
contradicted
unverifiable
discarded
```

An unavailable source, network failure, or rate limit must result in `unverifiable`, not `contradicted`.

## 7.5 Research adjudicator

File:

```text
.claude/agents/research-adjudicator.md
```

Responsibilities:

* apply verification events to the canonical ledger;
* preserve all meaningful conflict records;
* adjust confidence only with a written rationale;
* discard claims that fail provenance;
* produce the final retained claim ledger;
* produce a list of unresolved gaps.

It must not add new evidence.

## 7.6 Research synthesizer

File:

```text
.claude/agents/research-synthesizer.md
```

Responsibilities:

* use only the adjudicated ledger;
* follow `research/templates/canonical-report.md`;
* produce a self-contained report;
* attach conventional citations to factual statements;
* create a separate report-to-claim mapping;
* clearly label inference and uncertainty;
* include unresolved conflicts when material.

The report must be readable without exposing internal agent prompts.

Do not place internal claim IDs throughout the prose unless needed for audit readability. Store detailed mappings in `report-map.json`.

## 7.7 Research semantic validator

File:

```text
.claude/agents/research-semantic-validator.md
```

Responsibilities:

* inspect the drafted report only against the adjudicated ledger and report map;
* identify unsupported assertions, missing support mappings, concealed material conflicts, overstatement, and unlabeled inference;
* return a structured pass/fail result with targeted repair instructions.

It must not research, alter the ledger, write shared artifacts, or resolve factual conflicts. It is semantic review, not deterministic structural validation.

## 7.8 Research persistence writer

File:

```text
.claude/agents/research-persistence-writer.md
```

This is the only agent allowed to write the archived run.

Grant only the tools required to:

* create directories;
* write files;
* execute the validation script;
* read validation output.

It must not use web-search tools.

Responsibilities:

1. create the run directory;
2. write all finalized artifacts;
3. run the deterministic validator;
4. write `validation.json`;
5. return the final run path and validation status.

It may fix serialization or formatting defects.

It may not alter claims, evidence, confidence decisions, or conclusions.

---

# 8. Canonical data contracts

Create human-readable JSON Schemas under `research/schemas/`.

These schemas are documentation and fixtures for the deterministic validator. The workflow must also use inline structured output schemas for important agent calls.

## 8.1 Source

Required conceptual fields:

```json
{
  "source_id": "src_example",
  "title": "Source title",
  "publisher": "Responsible organization",
  "publication_date": "2026-01-15",
  "access_date": "2026-07-28",
  "url": "https://www.nist.gov/",
  "source_type": "official_record",
  "independence_group": "ig_example"
}
```

Allow `publication_date` to be null only when a genuine search cannot establish a date; record `publication_date_unavailable_reason` in that case.

At least one of `url` or `doi` must be present.

## 8.1a Research plan

The canonical research plan contains `query`, `interpreted_scope`, `assumptions`, `initial_depth`, `depth_rationale`, uniquely identified `subquestions`, `high_risk_areas`, `required_source_types`, `escalation_triggers`, `worker_count`, and `verification_policy`. It is immutable after persistence; any repair records its targeted reason in the manifest.

## 8.2 Claim

Required conceptual fields:

```json
{
  "claim_id": "clm_example",
  "statement": "A precise externally verifiable proposition.",
  "claim_type": "fact",
  "scope": "Population, geography, period, conditions, and limitations.",
  "materiality": "high",
  "supporting_evidence": [
    {
      "source_id": "src_example",
      "relationship": "supports",
      "locator": "Results, Table 2"
    }
  ],
  "counter_evidence": [],
  "confidence": "medium",
  "confidence_rationale": "Credible primary evidence but no independent replication."
}
```

Valid `claim_type` values should include:

```text
fact
estimate
source_assertion
interpretation
inference
recommendation
```

## 8.3 Verification event

Use an append-only event rather than mutating an earlier JSONL record in place.

Required conceptual fields:

```json
{
  "verification_event_id": "ver_example",
  "claim_id": "clm_example",
  "occurred_at": "2026-07-28T15:00:00Z",
  "outcome": "confirmed_with_qualification",
  "checked_source_ids": ["src_example"],
  "new_evidence": [],
  "rationale": "The direction was confirmed, but broader generalization was unsupported."
}
```

## 8.4 Report map

Map report units to claims without cluttering the final prose.

Example:

```json
{
  "report_units": [
    {
      "report_unit_id": "rpt_example",
      "section": "Key Findings",
      "text_sha256": "sha256-of-the-normalized-anchored-report-unit",
      "claim_ids": ["clm_example", "clm_example_2"],
      "is_inference": false
    }
  ]
}
```

An inference entry must identify its premise claim IDs.

## 8.5 Conflict

A conflict record has a unique `conflict_id`, competing claim IDs, their supporting and counter-evidence source IDs, the likely reason for disagreement, materiality, current disposition, and practical implication. The adjudicator may classify a conflict but may not erase credible counter-evidence.

## 8.6 Run manifest

The manifest accepts read-only version `1.0.0` archives and emits version `2.0.0` for new runs. Version 2 extends the archive with an auditable run-quality evaluation, generated lessons, and a policy snapshot; version 1 remains valid but cannot enter learning. The validator rejects missing, malformed, whitespace-padded, unsupported, unknown-major, and future versions without mutating or reinterpreting the archive. Unversioned pre-remediation archives are unsupported; a future migration needs explicit authorization and tests against genuine archived runs.

---

# 9. Research depth policy

The workflow must accept:

```text
auto
light
standard
deep
```

A user-specified depth is a minimum. The planner may escalate but may not silently reduce a user-requested depth.

## Light

Target:

* one or two subquestions;
* one or two workers;
* narrow source collection;
* verification only for critical, high-risk, conflicting, quantitative, or weakly sourced claims.

## Auto

Start from the planner's bounded assessment of query breadth, stakes, freshness, and expected conflict. Select Light, Standard, or Deep; escalation triggers may only increase the selected depth. Record the selected depth and rationale in the research plan and manifest.

## Standard

Target:

* three to five subquestions;
* two to five workers;
* source triangulation;
* verification of all critical and high-materiality claims;
* verification of conflicts and single-source quantitative claims.

## Deep

Target:

* four to eight primary subquestions;
* four to eight initial workers;
* broader source coverage;
* mandatory adversarial verification;
* explicit conflict adjudication;
* coverage and provenance audit;
* optional targeted repair round.

Do not treat these values as Claude Code platform limits. They are workflow cost controls.

## Escalation triggers

Escalate research depth when:

* credible primary sources disagree;
* the question expands materially during research;
* more than 25% of key claims remain weakly supported;
* the decision consequence is higher than initially understood;
* source freshness is insufficient;
* required primary evidence cannot be found;
* causal claims rely only on observational or secondary evidence.

---

# 10. Verification selection policy

Do not use a simple “two out of three sources agree” rule.

Select a claim for verification when any condition applies:

* materiality is `critical` or `high`;
* initial confidence is `low`;
* the claim has only one evidence source;
* all evidence belongs to one independence group;
* the claim contains a number, rate, date, ranking, threshold, forecast, or comparison;
* the claim is time-sensitive;
* the claim asserts causality;
* credible counter-evidence exists;
* a source has a financial, political, organizational, or reputational interest;
* the claim materially affects a recommendation;
* the query is in Deep mode.

For Standard and Deep modes, verify claims in parallel through `pipeline()`.

---

# 11. Dynamic workflow

Create:

```text
.claude/workflows/research-swarm.js
```

Use a native Claude Code workflow script with:

* an exported `meta` object;
* top-level `await`;
* `agent()` for single-agent stages;
* `pipeline()` for parallel per-item stages;
* inline JSON schemas for structured outputs;
* labels for understandable workflow progress.

Do not import OpenAI or Anthropic SDKs.

Do not attempt direct filesystem or shell access from the workflow script.

## 11.1 Metadata

Use:

```javascript
export const meta = {
  name: "research-swarm",
  description:
    "Run structured, parallel, adversarially verified research and return an auditable cited report"
};
```

## 11.2 Arguments

Support either a plain string or a structured object.

Structured input shape:

```json
{
  "query": "Research question",
  "depth": "auto",
  "maxWorkers": 8,
  "verification": "risk-based",
  "freshness": null,
  "outputRoot": "artifacts/research-runs"
}
```

Defaults:

```text
depth: auto
maxWorkers: 8
verification: risk-based
outputRoot: artifacts/research-runs
```

Reject an empty query with a clear error.

Clamp `maxWorkers` to a safe range of 1 through 8.

## 11.3 Workflow phases

Implement the following control flow.

### Phase A: Plan

Call one planning agent with a strict schema.

Validate:

* depth;
* worker count;
* subquestion count;
* unique subquestion IDs;
* assumptions;
* verification policy.

If the plan requests more workers than the configured maximum, consolidate related subquestions rather than truncating them blindly.

### Phase B: Research

Use:

```javascript
pipeline(plan.subquestions, ...)
```

Run one worker per assigned subquestion.

Each worker receives only:

* original query;
* interpreted scope;
* its subquestion;
* required source types;
* freshness constraints;
* shared evidence rules.

Workers must not receive other workers’ findings.

Require a structured claim-bundle result.

### Phase C: Normalize

Send all worker bundles to one normalizer.

The normalizer returns:

* canonical sources;
* canonical claims;
* conflict records;
* coverage gaps;
* proposed verification targets.

### Phase D: Select verification targets

Select targets deterministically in workflow code using the risk policy.

Union the deterministic selection with the normalizer’s recommended targets.

Deduplicate by claim ID.

### Phase E: Verify

If the target list is non-empty, use `pipeline()` to run one verification assignment per target.

A Deep run must not skip verification because the target list is accidentally empty. In that case, verify all high-materiality claims and a sample of medium-materiality claims.

### Phase F: Adjudicate

Send:

* canonical ledger;
* conflict records;
* verification events;
* uncovered gaps;

to one adjudicator.

Require:

* retained claims;
* discarded claims with reasons;
* unresolved conflicts;
* revised confidence;
* final gaps;
* repair recommendations.

### Phase G: Synthesize

Send only the adjudicated research state to the synthesizer.

Require structured output containing:

```text
report_markdown
report_map
executive_summary
key_claim_ids
unresolved_limitations
```

### Phase H: Validate semantically

Call a separate validation agent to inspect:

* claim-to-report coverage;
* unsupported report assertions;
* missing citations;
* concealed conflicts;
* overstatement;
* inference labeling;
* recommendation support.

Return a structured pass/fail result with targeted repair instructions.

### Phase I: Repair

Allow at most two repair rounds.

A repair round must operate only on identified defects.

Possible repair actions:

* remove unsupported prose;
* revise a claim’s scope;
* demote confidence;
* add an uncertainty label;
* restore a missing conflict;
* rerun one focused research assignment;
* rerun one focused verification assignment;
* regenerate affected report sections.

Do not rerun the entire research swarm unless the ledger is fundamentally invalid.

### Phase J: Persist

Call the single persistence writer with the final objects.

The writer must create:

```text
artifacts/research-runs/<UTC timestamp>-<query slug>/
├── manifest.json
├── plan.json
├── sources.jsonl
├── claims.jsonl
├── discarded-claims.jsonl
├── verification-events.jsonl
├── conflicts.json
├── coverage-gaps.json
├── semantic-validation.json
├── repair-events.jsonl
├── report.md
├── report-map.json
├── validation.json
├── run-quality-evaluation.json
├── lessons.jsonl
└── policy-snapshot.json
```

It must run:

```bash
node scripts/validate-research-run.mjs "<run-directory>"
```

### Phase K: Return

When validation passes, return:

1. `report_markdown`;
2. a brief audit footer containing:

   * depth;
   * worker count;
   * retained claim count;
   * discarded claim count;
   * verification count;
   * unresolved conflict count;
   * run directory.

Do not return raw agent transcripts.

When validation fails after the allowed repair rounds, return a transparent failure report and the archived run path.

## 11.4 Custom-agent routing compatibility

Dynamic Workflow calls may select a documented per-invocation model alias. The workflow must centralize that policy, use stable `sonnet` or documented inheritance rather than dated IDs, and leave session-model stages unpinned. Every substantive schema-producing or canonical-output stage uses Sonnet at minimum; planning and synthesis intentionally inherit the session model. `CLAUDE_CODE_SUBAGENT_MODEL` intentionally takes precedence if the user or environment sets it. This model selection is separate from named custom-agent selection and does not change reusable custom-agent `model: inherit` defaults.

The documented workflow interface does not establish an `agent()` option for selecting a named project custom agent. Do not invent one.

Use this implementation rule:

1. inspect locally available Claude Code workflow API documentation or current official documentation; official documentation is sufficient when CLI help does not enumerate the API, provided the installed version meets its documented compatibility requirement and no local evidence contradicts it;
2. when explicit custom-agent routing is officially supported, use it;
3. otherwise inline each role contract in the applicable workflow agent prompt;
4. still create `.claude/agents/*.md` so the roles are reusable outside the workflow.

The generated workflow must work without relying on an unverified option name.

For the broader mechanism boundary, including the distinction between this workflow's behavioral isolation and ordinary custom-subagent worktree isolation, see [the Engineering Constitution](engineering-constitution.md). This workflow does not gain those controls by that cross-reference.

---

# 12. Canonical report template

Create:

```text
research/templates/canonical-report.md
```

Use this structure:

```markdown
# Research Report

## Executive Summary

## Scope and Interpretation

## Key Findings

## Detailed Analysis

## Conflicting Evidence and Unresolved Questions

## Limitations and Evidence Gaps

## Conclusions

## Recommendations
<!-- Include only when the query warrants recommendations. -->

## Sources
```

Rules:

* Do not include an empty recommendations section.
* Separate evidence-backed conclusions from recommendations.
* Do not hide conflicting credible evidence in footnotes.
* Include publication dates for time-sensitive sources.
* Use direct quotations sparingly.
* Do not reproduce long source passages.
* Make uncertainty visible in the prose.
* Avoid claiming comprehensiveness when coverage is incomplete.

---

# 13. Deterministic validator

Create:

```text
scripts/validate-research-run.mjs
```

Usage:

```bash
node scripts/validate-research-run.mjs <run-directory>
```

Use exit code `0` for pass and nonzero for failure.

The validator must produce machine-readable JSON on stdout.

It must check:

## File integrity

* all required files exist;
* all JSON files parse;
* every JSONL line parses;
* the manifest identifies the same run directory;
* IDs are unique within their entity type.

## Source integrity

* every source has a source ID;
* every source has a title and publisher;
* every source has a source type;
* every source has an access date;
* every source has a URL or DOI;
* no placeholder URLs remain;
* independence groups are present.

## Claim integrity

* every retained claim has evidence;
* every evidence reference points to a known source;
* every counter-evidence reference points to a known source;
* every conflict reference points to a known claim;
* confidence values are valid;
* materiality values are valid;
* discarded and retained claim IDs do not overlap.

## Confidence integrity

A high-confidence claim must have either:

* support from at least two independence groups; or
* one primary or definitive authority plus an explicit sufficiency rationale.

A confidence increase after worker extraction must have an associated verification or adjudication rationale.

## Verification integrity

* every verification event references a known claim;
* every checked source ID exists;
* every outcome is from the allowed outcome list;
* `unverifiable` is not treated as `contradicted`.

## Report integrity

* every claim ID in `report-map.json` exists and is retained;
* every key claim ID appears in the report map;
* inference entries identify premise claims;
* unresolved material conflicts appear in the report;
* final validation status matches the validator result.

Do not attempt unreliable natural-language fact checking in the deterministic validator. Structural support checks belong here; semantic support checking belongs to the validation agent.

---

# 14. Tests

Use `node:test`.

Create tests covering:

1. a valid run passes;
2. a missing source reference fails;
3. an unknown claim ID in the report map fails;
4. a high-confidence claim with one weak source fails;
5. a high-confidence claim with a definitive primary authority and rationale passes;
6. duplicate claim IDs fail;
7. malformed JSONL fails;
8. an `unverifiable` verification event remains distinct from contradiction;
9. an unresolved high-materiality conflict missing from the report fails;
10. retained and discarded claim overlap fails.

Commands that must pass:

```bash
node --test tests/research-validation.test.mjs
node scripts/validate-research-run.mjs tests/fixtures/valid-run
```

Commands against invalid fixtures must exit nonzero.

---

# 15. Claude Code settings

Merge `.claude/settings.json` safely.

Add:

```json
{
  "workflowSizeGuideline": "medium"
}
```

This setting is advisory, not a hard concurrency cap. It is supported in settings files by Claude Code 2.1.219 and later.

Do not delete or reorder unrelated settings unnecessarily.

Do not enable bypass-permissions mode.

Do not add automatic hooks that run expensive validators after every file write.

Document an optional end-of-run hook separately only when useful, but the workflow must explicitly invoke the validator and must not depend on a global hook.

---

# 16. Documentation

Create `research/README.md`.

It must explain:

## Invocation

```text
/research-swarm What is the current evidence for ...?
```

Structured example:

```text
Run /research-swarm with:
{
  "query": "Compare the current approaches to...",
  "depth": "deep",
  "maxWorkers": 8,
  "verification": "risk-based"
}
```

## Requirements

Document:

* the minimum Claude Code version required by dynamic workflows;
* that workflows must be enabled;
* that web-search capability must be available for public-web research;
* that tool permissions still apply;
* that workflow resumption is session-scoped;
* that the workflow does not accept user input during a run.

## Outputs

Explain every archived file.

## Modes

Explain Light, Standard, Deep, and Auto.

## Audit model

Explain:

* source IDs;
* claim IDs;
* verification events;
* independence groups;
* report mappings;
* validation.

## Limitations

State clearly:

* source availability does not guarantee truth;
* verification reduces but does not eliminate error;
* inaccessible or rate-limited sources may remain unverified;
* multiple derivative sources do not equal independent confirmation;
* the workflow is not a substitute for qualified legal, medical, financial, or safety review.

---

# 17. Repository safety requirements

Before changing files:

1. inspect the existing directory structure;
2. inspect existing `CLAUDE.md`;
3. inspect existing `.claude/settings.json`;
4. inspect the project’s package and test configuration;
5. preserve project formatting conventions.

While implementing:

* do not overwrite unrelated content;
* do not rename existing agents or skills;
* do not change application source code;
* do not add secrets;
* do not add generated research results;
* do not commit files unless explicitly instructed;
* do not claim that the Claude Code workflow was runtime-tested unless Claude Code was actually available and the workflow was executed.

When Claude Code is unavailable, perform:

* syntax-oriented inspection;
* Node validator tests;
* fixture validation;
* static inspection of the workflow script;
* JSON parsing checks;
* cross-reference checks among documentation, schemas, and filenames.

---

# 18. Acceptance criteria

The build is complete only when all of these are true:

* `.claude/workflows/research-swarm.js` exists;
* the workflow exports the correct `meta` object;
* the workflow accepts a plain query and structured arguments;
* the workflow uses structured agent outputs;
* the workflow uses parallel workers;
* the workflow performs risk-based verification;
* Deep mode always performs adversarial verification;
* no worker or verifier writes shared state;
* one persistence writer owns artifact creation;
* the final report has a claim mapping;
* deterministic validation exists;
* valid fixtures pass;
* invalid fixtures fail for the expected reasons;
* documentation matches the actual filenames and commands;
* no OpenAI runtime integration was added;
* no external orchestration framework was added;
* no placeholders, TODOs, or pseudocode remain in required files.
* all eight custom roles, including the semantic validator, are defined;
* canonical research-plan, source, claim, verification-event, conflict, report-map, and manifest contracts are present;
* Auto, Light, Standard, and Deep mode behavior is documented.

---

# 19. Final Codex response

After implementing, return:

## Created

A concise list of created files.

## Updated

A concise list of existing files that were merged or modified.

## Validation

Show the exact test and validation commands run and their results.

## Claude Code smoke test

State one of:

* workflow successfully executed in Claude Code; or
* Claude Code runtime was unavailable, so only static and deterministic validation was completed.

## Invocation

End with:

```text
/research-swarm <your research question>
```

Do not merely describe what should be built. Create the complete implementation.

---

# 20. Audit-run-1 remediation authorization

Milestone 12 is documentation-only. Its remediation matrix in `docs/audit-run-1-remediation-plan.md` is binding for Milestones 13–20. Every audit finding must be implemented, documented as a rationale-backed deviation, or retained as an explicitly unresolved platform limitation; no recommendation may be silently rejected.

The runtime remains the native Claude Code dynamic workflow. Per-role write isolation is behavioral—not hard permission isolation—until Claude Code documents named-agent routing or per-call tool restrictions. This limitation must be described accurately in user-facing documentation.

Canonical JSON Schema files are the single contract source. Ajv 8 is approved as the sole new dependency and may be used only to enforce those schemas. Workflow inline schemas and schema-derived validator constants must be generated from the canonical schemas and checked for drift.

Milestones that alter archive contracts must preserve existing fixtures and archived runs, or provide and validate an explicit migration. Unversioned pre-remediation archives are explicitly unsupported because no genuine historical corpus exists; any future migration needs explicit authorization and tests against genuine archived runs. Milestone 20 must execute the complete offline regression suite and one Claude Code smoke test when the runtime is available; otherwise it must record the exact unavailable-runtime evidence without claiming a smoke result.

---

# 21. Adaptive self-improvement acceptance

Version-2 archives must retain a fixed-rubric evaluation even when no useful lesson is produced. Lessons are provisional first; only relevant, bounded, constitution-compatible active lessons may enter a later prompt. Promotion requires permitted independent evidence, and policy canaries must retain a reversible baseline snapshot and roll back on critical regression. A lesson or evaluator may not lower the fixed two-counterexample rollback threshold.

Generated learning state stays under ignored `artifacts/research-learning/`; it must never include live query, report, source, private-feedback, or untrusted-instruction text in directives. Automation may create only reviewable durable-change proposals and may not rewrite protected repository files. Version-1 archives remain read-only-valid and cannot enter learning.

Production readiness requires separately recorded current Claude Code runtime evidence: one bounded Light and one bounded Deep version-2 archive must validate, with honest separation from deterministic fixture/replay evidence. Document behavioral, rather than hard permission, role isolation until the Claude Code interface documents named-agent routing or per-call restrictions.
