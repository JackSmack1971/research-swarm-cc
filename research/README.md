# Research Swarm

Run a structured, auditable public-web research workflow inside Claude Code:

```text
/research-swarm <research question>
```

For example:

```text
/research-swarm What evidence supports and challenges the effectiveness of intervention X?
```

## Requirements and setup

Dynamic workflows require Claude Code 2.1.154 or later. This repository was checked with 2.1.220. The included `.claude/settings.json` uses the documented `workflowSizeGuideline` setting, which requires Claude Code 2.1.219 or later.

The workflow routes every substantive schema-producing/canonical-output stage to `sonnet`; planning and synthesis intentionally inherit the current session model. This minimum follows a repository-specific Haiku structured-output retry failure, not a universal model-capability claim. If `CLAUDE_CODE_SUBAGENT_MODEL` is set in the user environment, it intentionally overrides every per-stage route; do not set it for this selective policy.

Enable **Dynamic workflows** in Claude Code’s `/config` when your plan exposes that setting. It is not enabled by a project `settings.json` key. Public-web research also requires that Claude Code makes `WebSearch` and `WebFetch` available to the worker and verifier roles.

Custom-agent files express the intended least privilege, including read-only worker and verifier definitions. Dynamic-workflow agents currently rely on behavioral instructions: they inherit the Claude Code session permissions, and documented workflow calls cannot select a named custom agent or impose a per-call tool allowlist. For sensitive runs, start Claude Code with a narrow session-level allowlist. The persistence writer is the only role instructed to create the archive.

Runs are session-scoped: resume the same Claude Code session to continue a workflow context. The workflow does not pause for or accept mid-run user input; resolve important scope choices before invoking it.

## Structured arguments

The command accepts either a plain query or an object with these fields:

```text
/research-swarm {"query":"Compare approaches A and B","depth":"deep","maxWorkers":6,"verification":"risk-based","learning":"adapt","freshness":"sources published since 2024","outputRoot":"artifacts/research-runs"}
```

| Field | Values | Default |
| --- | --- | --- |
| `query` | non-empty string | required |
| `depth` | `auto`, `light`, `standard`, `deep` | `auto` |
| `maxWorkers` | integer, 1–8 | depth-aware |
| `maxSourcesPerWorker` | integer, 1–12 | depth-aware |
| `maxClaimsPerWorker` | integer, 1–15 | depth-aware |
| `maxCanonicalClaims` | integer, 1–40 | Light 8, Standard 12, Deep 20 |
| `maxVerificationTargets` | integer, 1–40 | depth-aware |
| `maxVerifierConcurrency` | integer, 1–8 | depth-aware |
| `maxGapFillWorkers` | integer, 1–2 | depth-aware |
| `verification` | `none`, `risk-based`, `all-material` | `risk-based` |
| `learning` | `off`, `evaluate`, `adapt` | `adapt` |
| `freshness` | non-empty string | none |
| `outputRoot` | `artifacts/research-runs` or safe lowercase descendants | `artifacts/research-runs` |

## Modes

* **Auto** lets the planner choose `light`, `standard`, or `deep` from scope and risk.
* **Light** bounds the plan and permits the selected verification policy; use it for narrow, low-consequence questions.
* **Standard** is the normal minimum depth for multi-source questions and uses the selected verification policy.
* Resource defaults are Light: 2 workers/8 canonical claims, Standard: 3/12, and Deep: 4/20. The lean defaults keep normal runs small; explicit structured limits still reach the hard limits of 8 workers, 12 sources and 15 claims per worker, 40 canonical claims and verification targets, 8 concurrent verifiers, and 2 focused gap workers. Invalid numeric limits fall back to the depth default; values above a hard limit are capped.
* Claims beyond the canonical budget are ranked by materiality, confidence risk, and claim ID. Omitted work becomes an auditable coverage gap; an omitted critical claim creates a critical gap. Verifiers run in sequential bounded-concurrency chunks.
* The planner merges overlapping angles and creates only the distinct subquestions needed for coverage. After normalization, the workflow may launch at most the configured focused gap workers for a high/critical unresolved gap, a missing required source type, or another existing escalation signal; it never starts a generic second research wave. Only incremental evidence for those named defects is normalized, and any exhausted canonical budget remains an auditable coverage gap.
* The persisted plan records effective depth, effective verification policy, rationale, and limits. Outside Deep, `none` remains `none`; `risk-based` can be escalated and `all-material` cannot be reduced. Deep always verifies every admitted canonical claim. Post-normalization high-risk conflicts, severe gaps, weak material evidence, missing primary evidence, and high-stakes scope can raise depth once without restarting the swarm.
* **Deep** verifies every normalized claim adversarially, even when the requested policy is `none`.

The workflow always plans, researches isolated subquestions in parallel, normalizes evidence, selects verification targets, adjudicates, synthesizes, semantically reviews, performs at most two targeted report repairs, and uses one persistence writer. It returns the report and archived run directory only.

## Optional feedback

After a validated version-2 run, register scoped feedback without changing the archive:

```text
/research-feedback run_example {"kind":"correction","text":"This applies only in Ontario for version 4.2.","scope":{"domain":"Ontario version 4.2","conditions":["Ontario","software version 4.2"]},"affected_claim_ids":["clm_example"]}
```

Feedback may be a factual correction, a preference, a usefulness rating, or an observed outcome. Preferences are never treated as factual corrections. Feedback is atomically recorded in ignored learning state; repeat submissions are idempotent. Private feedback is retained only there and is never copied into generated policy. High-risk feedback-driven lesson changes require an independent critic review, and no feedback can weaken the constitution or security controls.

## Adaptive learning status

Every version-2 run retains an auditable evaluation record. `off` uses the baseline policy, creates no lessons, and records only deterministic non-learning evaluation fields. `evaluate` also uses the baseline policy, then runs quality evaluation for reviewable lessons. `adapt` selects bounded active policy before research and performs the same quality evaluation. The friction evaluator runs only when deterministic lifecycle signals show a failure, repair, significant unresolved gap, resource ceiling, or validation defect; clean runs record canonical no-detected-friction fields instead. Lessons start provisional; only bounded, relevant active lessons can guide a later run. The system does not train model weights and does not guarantee every run improves. Canaries and rollback protect active policy, while durable repository changes remain human-reviewed proposals.

## Archived run

Each run directory contains:

| File | Purpose |
| --- | --- |
| `manifest.json` | Archive schema version, run ID, creation time, plan ID, archive paths, and record counts. |
| `plan.json` | The interpreted scope, assumptions, depth, subquestions, risks, and verification policy. |
| `sources.jsonl` | Source records with source IDs, provenance, access dates, and independence groups. |
| `claims.jsonl` | Retained claims with claim IDs, evidence locators, confidence, materiality, and counter-evidence. |
| `discarded-claims.jsonl` | Claims excluded from the final ledger, with discard reasons. |
| `verification-events.jsonl` | Append-only adversarial verification attempts and outcomes. |
| `conflicts.json` | Explicit conflicts, their competing claims and sources, reasons, implications, and status. |
| `coverage-gaps.json` | Every normalization gap with its final disposition. |
| `semantic-validation.json` | The final structured semantic-review outcome. |
| `repair-events.jsonl` | Each targeted repair attempt and its classified action type. Ledger repairs reverify changed or newly admitted Deep claims before readjudication. |
| `report.md` | The reader-facing final report. |
| `report-map.json` | The mapping from anchored report units to retained claim IDs and, for inferences, their premise claim IDs. |
| `validation.json` | The machine-readable deterministic structural-validation result. |
| `run-quality-evaluation.json` | Version-2 only: fixed-format run-quality evaluation and generated lesson IDs. |
| `lessons.jsonl` | Version-2 only: attributable, scoped adaptive lessons generated for this run. |
| `policy-snapshot.json` | Version-2 only: the bounded policy bundle and lesson IDs used by the run. |

Version `1.0.0` archives remain read-only-valid. New archives use version `2.0.0`, require all three adaptive artifacts, and are the only archives eligible to become learning evidence.

`src_` IDs identify sources; `clm_` IDs identify claims; `ver_` IDs identify verification events; and `conf_` IDs identify evidence conflicts. An `independence_group` identifies a shared underlying origin, so derivative coverage is not mistaken for independent confirmation.

## Report anchors

Every material report unit is enclosed in matching comments:

```md
<!-- report-unit:rpt_<id>:start -->
Material report prose.
<!-- report-unit:rpt_<id>:end -->
```

Each `report-map.json` unit uses the same `report_unit_id` and records `text_sha256`. The deterministic validator normalizes the enclosed text as UTF-8, converts line endings to LF, removes leading and trailing blank lines and report-unit anchor comments, preserves meaningful internal whitespace, then hashes the normalized text with SHA-256. Markers in fenced code blocks are literal examples and are ignored. Headings and purely presentational lines may be outside units; all other report prose must be enclosed.

Generated run directories are ignored by Git; the archive root is retained with `.gitkeep`.

Archives currently support exactly schema versions `1.0.0` and `2.0.0`; only version `2.0.0` can enter learning. Unversioned pre-remediation archives and every other version fail validation without being changed or reinterpreted. A future migration requires explicit authorization and tests against genuine archived runs.

`outputRoot` rejects absolute, Windows-drive, UNC, backslash, traversal, encoded, control-character, empty-segment, reserved-device, and trailing-dot/space paths. Each run uses a bounded query slug, so source text cannot choose a directory name. The current Claude Code runtime rejects direct clock/random calls in the workflow; repeated identical queries can therefore collide and should use distinct safe output roots until the runtime documents a collision-safe primitive.

## Validation

Run the offline checks from the repository root:

```text
node --test tests/research-validation.test.mjs
node scripts/finalize-research-run.mjs artifacts/research-runs/<run-id>
node scripts/validate-research-run.mjs tests/fixtures/valid-run
node scripts/validate-research-run.mjs tests/fixtures/invalid-missing-source
node scripts/validate-research-run.mjs tests/fixtures/invalid-unknown-claim
node scripts/validate-research-run.mjs tests/fixtures/invalid-confidence
```

The finalizer is run only by the persistence writer after it has written the supplied archive objects. It canonicalizes JSON/JSONL, refreshes manifest paths and counts, repairs report-unit hashes only, and captures the validator result without changing research records. The valid fixture command passes; each invalid fixture must emit `valid: false` and exit nonzero.

## Limitations

Source availability does not establish truth, and verification reduces rather than eliminates error. Inaccessible or rate-limited sources can remain `unverifiable`; repeated coverage from one study, filing, press release, interview, or dataset is not independent confirmation. Use qualified legal, medical, financial, safety, or other high-stakes review before relying on a report for consequential decisions.

Current runtime acceptance is incomplete: an initial 2026-08-01 bounded Light attempt reached Claude Code's explicit Dynamic Workflow review gate and did not execute. Later bounded Light runs reached worker and normalization stages but retained zero eligible claims when official sources were inaccessible or the worker returned no usable evidence; neither produced an archive or `/workflows` measurement. No Deep run is claimed. Offline validation proves structure and control behavior only.
