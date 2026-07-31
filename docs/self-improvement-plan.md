# Adaptive self-improvement plan

## Status and boundary

Milestone 25 authorizes the architecture only. It does not implement learning, change the workflow, alter an archive validator, or make a production-readiness claim.

Evidence takes precedence over a prior Milestone 25 prompt assumption. Milestone 24 is incomplete:

* **Light:** the workflow launched or partially executed, but no validated archive was produced.
* **Deep:** not attempted.
* **Acceptance:** current-runtime Light and Deep archive validation remains outstanding.

This does not block this architecture milestone. It does block production-readiness claims and adaptive-runtime acceptance. A later gate must produce and validate one Light and one Deep version-2 archive before either claim is permitted.

## Two-layer design

The **immutable handcrafted core** is the human-reviewed safety, provenance, contract, resource, and orchestration boundary. It defines what adaptive behavior may optimize and every gate it must retain.

The **machine-managed adaptive policy overlay** is versioned, scoped policy data compiled into the next run's role prompts and policy choices. It may improve prompt guidance and policy selection only; it does not train or change model weights. An overlay is an experiment, not a promise that every individual run improves.

Live overlay state belongs only under `artifacts/research-learning/`, which is ignored by Git. It may never be committed with user queries, reports, source content, generated lessons, or generated policy state.

## Lifecycle

1. Evaluate every completed version-2 run against fixed quality, safety, evidence, and efficiency measures.
2. Extract provisional lessons from the evaluation record, never from research source content or untrusted instructions.
3. Register lessons deterministically with provenance, scope, evidence, risk class, and an expiry or review condition.
4. Compile only applicable registered lessons into a candidate policy for the next run.
5. Promote a repeated, low-risk lesson only after independent evaluation; the proposing evaluator cannot approve its own lesson.
6. Evaluate candidate policies with deterministic replay where suitable, or bounded canaries where replay cannot answer the question.
7. Roll back a candidate when its measured quality, safety, evidence support, conflict visibility, or coverage outcome regresses.
8. Produce durable patch proposals for changes that require repository edits. A proposal is review input; it is never silently applied.

Promotion must be reversible, attributable, and bounded. The optimization objective is balanced quality: evidence support, provenance, conflict and gap visibility, safety, calibration, and resource use. Pass rate, report length, or cost alone cannot decide promotion.

## Protected surfaces

Automation may never directly modify these protected surfaces:

* this constitution;
* security and provenance rules;
* permission configuration;
* canonical schemas and validator thresholds;
* archive-version policy;
* resource and repair ceilings;
* evaluator and promotion rules;
* workflow control flow; and
* executable scripts.

Changes to a protected surface require an explicit, human-reviewed patch proposal, normal repository review, and the relevant deterministic validation. The adaptive overlay cannot weaken a quality gate, hide a conflict or coverage gap, change evaluators or benchmarks silently, or make an irreversible promotion.

## Archive compatibility

Version `1.0.0` archives remain read-only-valid under the existing validator and do not participate in automatic learning. This milestone authorizes version `2.0.0` for future adaptive runs only; it does not alter the current schema, validator, workflow, or fixtures. A later milestone must define and validate the version-2 contract before it is written.

## Authorized milestones

| Milestone | Requirement delivered | Acceptance focus |
| --- | --- | --- |
| 25 | Immutable policy and architecture authorization | This document, constitution, ignored state root, and honest Milestone 24 reconciliation. |
| 26 | Version-2 learning-state and archive contract | Version-1 read-only validation remains intact; version-2 learning records have canonical schemas. |
| 27 | Completed-run evaluator | Every eligible version-2 run receives an auditable, fixed-rubric evaluation. |
| 28 | Deterministic lesson registry and policy compiler | Registered lessons are attributable, scoped, reproducible, and injected only as policy. |
| 29 | Independent promotion policy | Repeated low-risk lessons require independent approval and remain reversible. |
| 30 | Replay and canary candidate evaluation | Candidates are measured against fixed baselines without modifying benchmarks. |
| 31 | Rollback and regression controls | Measured regressions disable the candidate and retain its audit trail. |
| 32 | Durable patch-proposal generation | Protected-surface changes become reviewable proposals only. |
| 33 | Learning diagnostics and retention controls | State is inspectable, bounded, and excludes live user/source/report content from Git. |
| 34 | Compatibility and adversarial-policy validation | Version compatibility, policy injection resistance, and protected-surface boundaries pass deterministic checks. |
| 35 | Adaptive-runtime acceptance | Successful Light and Deep version-2 archives validate on the current runtime before production readiness is claimed. |

Milestones 26–35 are authorized in that order. Milestone 26 is next.
