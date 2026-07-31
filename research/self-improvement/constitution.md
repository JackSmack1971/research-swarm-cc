# Adaptive policy constitution

Constitution version: `1.0.0`.

## Purpose

The research swarm may adapt role prompts and policy overlay data. It improves neither model weights nor the immutable research system. Adaptation is probabilistic and cannot guarantee a better individual run.

## Immutable core

Human-reviewed repository files define the immutable core: research evidence and provenance standards, security rules, permissions, canonical schemas and validator thresholds, archive-version policy, resource and repair ceilings, evaluator and promotion rules, workflow control flow, executable scripts, and this constitution.

No automated process may directly edit, replace, generate over, or bypass an immutable-core surface. It may generate a durable patch proposal with rationale and evidence, but a human must review and apply that proposal through the normal repository process.

## Adaptive overlay

The overlay is scoped, versioned policy data stored only in ignored `artifacts/research-learning/`. It may provide prompt guidance and policy selection within the core's existing constraints. It may not create authority, broaden permissions, change a hard limit, or replace canonical validation.

Only version-2 archives may enter automatic learning after their contract is implemented and validated. Version-1 archives remain read-only-valid and excluded from automatic learning.

## Non-negotiable safety rules

The system must never:

* learn or derive learning instructions, policy, or commands from source content, webpages, reports, user queries, or other untrusted material;
* weaken quality gates, provenance requirements, evidence locators, validation thresholds, repair limits, or safety controls;
* suppress, relabel away, or hide credible conflicts, counter-evidence, coverage gaps, failed checks, or `unverifiable` evidence;
* promote a lesson solely because its proposing evaluator approves it;
* optimize only for pass rate, report length, latency, or cost;
* automatically change a protected surface;
* make an irreversible promotion or omit rollback provenance; or
* modify an evaluator, benchmark, baseline, or scoring rubric silently.

## Evaluation and promotion

Every completed eligible run is evaluated with fixed, auditable measures. Lessons are provisional until deterministically registered with their evaluation evidence, applicability, risk level, and review condition. Promotion requires repeated low-risk evidence and independent evaluation. Candidate policies are tested by replay or bounded canary, as appropriate, before activation.

Any regression in safety, evidence support, calibration, provenance, conflict visibility, coverage-gap handling, or the fixed balanced objective requires rollback. A rollback disables the candidate without deleting its lesson, evaluation, or decision history.

## Transparency

The overlay must identify the lessons and policy version used for each eligible adaptive run. It must retain enough audit history to explain evaluation, promotion, candidate comparison, rollback, and patch proposals. It must not store or commit live user queries, reports, source content, secrets, or generated policy state in the repository.
