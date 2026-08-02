# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Fixed

- Generated research contracts now preserve canonical fields named `title` and `description`, so required structured-output fields remain satisfiable; Sonnet routing stays temporary pending valid-contract runtime evidence.
- Research workflow model routing no longer fails during initialization because of a JavaScript temporal-dead-zone collision.

### Added

- Added a deterministic, digest-bound delivery manifest and `/delivery-handoff` fresh-session renderer that preserves independent proof status and fails closed on missing or drifted delivery records.
- Added fresh-context independent verification with append-only criterion proof records, required runtime/browser/API/LSP/security evidence, and at most two targeted repair rounds; implementation events remain unverified and cannot merge or deploy.
- Added a bounded isolated-worktree executor that rechecks authorization, records immutable unverified implementation events, and cannot merge or deploy.
- Added a deterministic, safe engineering benchmark harness with a representative brownfield suite, raw plain-Claude baseline evidence, reproducible fixture resets, and non-authorizing comparison metrics.
- Added deterministic pre-execution risk classification and bounded task authorization with drift, uncertainty, proof, and human-control safeguards; it never merges, deploys, or executes production work.
- Added deterministic task-graph and minimal context-capsule compilation for accepted, current Change Contracts, with dependency, collision, and drift safeguards.
- Added a disposable, revision-checked prototype lane that records bounded experiment evidence, cleans isolated worktrees, and blocks direct prototype-code promotion.
- Added a durable, machine-validatable Change Contract with decision-to-requirement lineage, observable acceptance criteria, revision drift checks, and deterministic Markdown rendering.
- Added a manual `/build` decision router that records engineering uncertainty and asks people only for normative or consequential choices.
- Added a strict, scoped engineering evidence-packet compiler that preserves validated research provenance without creating decisions or requirements.
- Added a read-only `npm run profile -- <absolute-target-directory>` command that inventories target-project metadata, stamps it for drift detection, and reports optional code-intelligence capability data without building a repository map.
- Added an engineering constitution that separates evidence, intent, and delivery without adding an executor or runtime surface.
- Added repository-specific contribution, conduct, and security reporting policies.
- Research optimization benchmarks can now collect validated archive metrics and deterministic agent-path estimates without fabricating workflow token telemetry.
- Research learning can now be paused, resumed, inspected, rebuilt, and restored from an auditable snapshot without exposing research content.
- Research improvement proposals can now be prepared with independent evidence and tested safely before human review.
- Low-risk generated research policies can now be canaried, promoted after independent wins, and rolled back with preserved prior snapshots.
- Research policy candidates can now be compared against preserved evidence ledgers without mistaking fixed-ledger results for search improvements.
- Research learning now keeps auditable lesson lifecycle decisions, including expiry, supersession, and rollback.
- People can now add scoped corrections, preferences, usefulness ratings, and outcomes to a completed research run without changing its historical archive.
- Research runs can now safely reuse bounded, relevant lessons from prior validated runs.
- Research runs now receive independent quality and friction evaluations with provisional, auditable lessons.
- Added documented safeguards for future adaptive research policy, including human review and rollback requirements.
- Added version-2 research archives with auditable learning records while keeping existing archives readable.

### Changed

- The roadmap now allows architecture-only planning before workflow approval while requiring prototype evidence, risk authorization, and an engineering benchmark before executor work.
- The project now has an outcome-led, gate-driven roadmap at `docs/ROADMAP.md` that prioritizes live Claude Code runtime acceptance before conditional engineering expansion.
- Deep ledger repairs now adversarially reverify changed or newly admitted canonical claims, and every workflow role is explicitly prohibited from nested delegation.
- Research archive finalization now deterministically serializes records, refreshes structural metadata and report hashes, and captures validation without changing research decisions.
- Research learning now distinguishes `off`, baseline `evaluate`, and adaptive `adapt` modes; clean runs avoid friction-evaluator calls while retaining compatible audit records.
- Research workflow prompts now receive only role-scoped adaptive guidance and the evidence needed for their stage.
- Research workflow stages now use documented per-invocation model routing, keeping planning and synthesis on the session model.
- Research runs now start with leaner Standard and Deep evidence budgets, adding bounded focused gap filling only when normalized evidence exposes a qualifying defect.
- Claude Code startup now skips dependency installation when the research tools are already ready, and research recovery avoids reprocessing previously registered runs.
- Research workflows now restore the bounded depth resource limits required to start planning on the current runtime.
- Research workflows now accept serialized request arguments, avoid unsupported direct clock/random calls at startup, and give each worker a web-call budget aligned with its source limit.
- Research workflows now split normalization into source, claim, and relationship outputs to fit the current runtime's structured-output limits.
- Research archives now declare a version and clearly reject unsupported older or newer formats.
- Research runs can now repair evidence, verification, and archive-format defects through one auditable two-round limit.
- Claude Code now launches the research workflow reliably before validating its request.
- Research workflow files now retain a compatible line format when checked out.
- Research runs now retain canonical-claim budget gaps through adjudication and archival.
- Research runs now retain narrowly scoped repair actions and return safe, stage-specific failure diagnostics.
- Research runs now apply bounded, risk-prioritized research and verification budgets with auditable escalation decisions.
- Research runs now reject unsafe archive paths and ignore instructions hidden in research material.
- Research reports now preserve an auditable hash link between each material passage and its supporting claims.
- Research archives now retain verification history, evidence gaps, semantic reviews, and repair records.
- Research archives now reject malformed evidence records before report-support checks run.
- Research verification now preserves and audits newly discovered supporting, qualifying, and contradictory evidence.

### Security

- Updated Ajv to 8.20.0 to remove the known ReDoS risk in schema validation.
- Research policy rollback now requires two counterexamples, preventing an evaluator from lowering its own safety threshold.
