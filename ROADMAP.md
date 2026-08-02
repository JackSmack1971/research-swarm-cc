# Research Swarm Roadmap

> **Status:** active planning document
> **Last reviewed:** 2026-08-01
> **Planning horizon:** ordered capabilities, not delivery-date commitments

## Purpose

Evolve the existing Claude Code Deep Research Swarm into an evidence-grounded engineering system without weakening its current research guarantees. The product path is:

```text
validated evidence -> explicit decision -> change contract -> isolated delivery -> independent proof
```

The immediate priority is to prove the current research workflow in a live Claude Code session. That runtime gate blocks execution authorization, not architecture-only engineering design. Engineering capabilities retain the repository's Claude Code-only, schema-first, deterministic-validation architecture.

## Roadmap principles

- **Outcomes before outputs.** Each milestone has an observable completion gate, not just a file list.
- **Now / Next / Later over date fiction.** Near-term work may be planned in detail; later work is intentionally conditional.
- **Evidence does not decide.** Research claims inform decisions; a decision separately authorizes a requirement.
- **Progressive rigor.** Small reversible changes stay lightweight; high-risk or multi-session changes gain durable contracts and independent verification.
- **Minimal mechanism.** Reuse existing repository capability, Node.js, native Claude Code features, or approved dependencies before adding machinery.
- **Proof before promotion.** New capability advances only when deterministic checks and its stated real-world gate both pass.
- **Human control at meaningful boundaries.** Early engineering automation may prepare and verify work, but does not merge or deploy.

These practices follow current agile-roadmap guidance to communicate a dynamic strategic plan through broad horizons and to revise it as evidence changes, rather than treating a feature/date list as a contract. [Atlassian](https://www.atlassian.com/agile/product-management/roadmaps) and [Notion](https://www.notion.com/use-case/product-management/agile-product-management) describe the same outcome-led, regularly updated approach.

## Source of truth and operating rules

| Authority | Use |
| --- | --- |
| [`docs/research-swarm-spec.md`](research-swarm-spec.md) | Current architecture, canonical contracts, and acceptance requirements |
| [`docs/research-swarm-progress.md`](research-swarm-progress.md) | Implemented state, decisions, validation evidence, and known limits |
| This roadmap | Ordered future bets, gates, dependencies, and explicit non-goals |

The specification and progress record override this roadmap when they conflict. A milestone is not complete because it appears here: its completion evidence must be recorded in progress and validated in the repository.

## Current state

The research system has canonical provenance and claim contracts, adversarial verification, bounded repair, auditable archives, guarded learning, deterministic Node.js validation, and accepted current-runtime Light and Deep evidence. Milestones 36–47 and 50–54 are complete.

Current-runtime Light and Deep version-2 archive acceptance is complete by maintainer verification. The current platform still does not prove hard per-role write isolation; that constraint remains behavioral and is mitigated for delivery by deterministic scope/drift checks and isolated worktrees.

## Outcome map

| Horizon | Desired outcome | Entry condition | Exit condition |
| --- | --- | --- | --- |
| **Now** | The research swarm is proven in its intended runtime. | Existing offline suite remains green. | Validated current-runtime Light and Deep v2 archives; limitations recorded truthfully. |
| **Next** | Engineering decisions become explicit, traceable, and safe to hand off. | Architecture work may begin now; execution authorization requires runtime acceptance. | A change can trace evidence/decision to acceptance criteria and a drift-aware task context. |
| **Later** | The system delivers bounded changes in isolation and independently proves them. | Change-contract and context pipeline is reliable. | A representative change passes independent verification with an auditable handoff. |
| **Conditional** | The system generalizes to new projects and learns cautiously. | Delivery evidence shows stable value. | Benchmarks demonstrate improved first-pass criteria success without weaker safety or excessive cost. |

## Milestones

### Now — prove the existing product

| ID | Outcome | Completion gate | Dependencies / non-goals |
| --- | --- | --- | --- |
| **46 — Foundation closure** | Establish whether the existing research product is ready for real use. | Run bounded Light and Deep workflows in current Claude Code; validate both resulting v2 archives; record actual workflow telemetry if exposed. Decide and document CI, license, and release hygiene gaps separately. | Requires an available Claude Code session and explicit workflow approval. Does not add an engineering runtime or claim hard role isolation. |

### Next — make engineering intent durable

| ID | Outcome | Completion gate | Dependencies / non-goals |
| --- | --- | --- | --- |
| **47 — Engineering constitution** | **Complete:** [Engineering Constitution](engineering-constitution.md) defines the Evidence, Intent, and Delivery truth planes; ownership; autonomy/rigor; risk; and Claude Code mechanism boundary. | Architecture-only document and canonical boundary decisions reviewed against the existing spec. | Completed independently of 46. No executor, workflow, or new runtime surface. |
| **48 — Project profiler and code-intelligence abstraction** | **Complete:** Reliably identify a target repository's stack, declared commands, CI, project instructions, LSP configuration, and optional intelligence capability data. | Deterministic profile, source revision/fingerprint, drift detection, CLI, and representative Node/Python fixtures are covered by `node:test`. | Follows 47. Metadata only; no permanent repository map or Graphify implementation. |
| **49 — Structural repository graph adapter** | **Blocked:** Graphify 0.8.38 was inspected and partially exercised, but no representative four-class benchmark could run. | Resume only with an approved semantic-extraction backend and a functioning Graphify benchmark on the generated graph; then compare against LSP/search. | Follows 48. Graph data is derived and revision-stamped, never canonical; no mandatory Graphify dependency or always-on hook. |
| **50 — Evidence bridge** | **Complete:** Validated, semantically passed research archives can compile into scoped engineering evidence packets when research is warranted. | Invalid, unverified, or out-of-scope research cannot enter an engineering decision; provenance remains traceable. | Follows 47; may use 48/49 only as optional context. Research is one input path, never a universal prerequisite or an automatic requirement source. |
| **51 — Decision router** | **Complete:** Route uncertainty to no further inquiry, codebase inspection, research, a prototype, a human, or an agent choice. | Strict records and fixtures prove factual uncertainty does not interrupt the human while normative, hard-to-reverse, and consequential choices do. | Follows 50. Ask one high-value question at a time. |
| **52 — Change contract** | **Complete:** Make draft requirements, acceptance criteria, constraints, risks, and base revision machine-validatable and renderable for people. | Stable IDs link every requirement and criterion; delta changes and repository drift are represented and tested. | Follows 51. The contract is durable; a prose plan is not the source of truth. It does not authorize execution. |
| **53 — Prototype lane** | **Complete:** Resolve draft-contract UX, state, or architecture uncertainty through disposable isolated experiments. | Prototype output is explicitly classified as evidence, accepted/rejected/inconclusive, revision-stamped, cleaned up, and cannot silently become production code. | Follows 52. Required whenever inspection leaves execution-relevant uncertainty. |
| **54 — Task graph and context compiler** | **Complete:** Produce vertical slices and minimal task capsules from an accepted contract and current repository state. | Every task maps to acceptance criteria; capsules invalidate and regenerate on source drift. | Follows 48, 52, and any required 53 prototype; uses 49 only when its benchmark earns it. |

### Later — deliver with independent proof

| ID | Outcome | Completion gate | Dependencies / non-goals |
| --- | --- | --- | --- |
| **55 — Basic risk classification and execution authorization** | Classify a proposed change before implementation and authorize only the required evidence, isolation, and human controls. | Each task has a recorded risk class and authorization decision; unresolved draft-contract uncertainty blocks execution. | Follows 54 and requires 46 runtime acceptance. Low-risk work stays lightweight. |
| **56 — Engineering benchmark harness** | **Complete:** Establish representative, reproducible pre-executor tasks and an actual plain-Claude baseline. | Deterministic collection/comparison, safe fixture reset, raw baseline evidence, and full offline validation preserve criteria success, rework, human attention, cost, and safety-gate definitions before executor claims are evaluated. | Follows 54; benchmark fixtures do not authorize production changes or prove executor value. |
| **57 — Production executor** | **Complete:** Implement authorized bounded task slices in isolated worktrees using risk-appropriate tools and effort. | Deterministic controller tests prove pre-execution authorization drift rejection, anchor scope containment, planning-state mutation rejection, immutable events, and a representative authorized fixture change. | Follows 55 and 56. No autonomous merge, deployment, or self-verification. |
| **58 — Independent verification plane** | **Complete:** Validate a change against its contract from fresh context, with bounded targeted repair. | Separate verifier events and criterion proofs reject self-approval, stale identities, unsupported criteria, insufficient runtime evidence, and repair exhaustion. | Follows 57. The executor event remains unverified; no merge or deploy path. |
| **59 — Delivery and handoff** | **Complete:** Preserve a concise delivery manifest and resume path. | A fresh Claude session can validate canonical references and understand the decision, contract, change identity, proofs, and unresolved risks without replaying the prior conversation. | Follows 58. It cannot execute, approve, push, merge, or deploy. |
| **60 — Production risk profiles** | **Complete:** Apply conditional gates for security, data, API, UI, migration, infrastructure, and dependency changes. | Activated profile gates cannot bypass their required evidence or checks. | Follows 58. It refines, rather than replaces, the basic pre-execution risk classification. |

The maintainer will manually test a representative chain from an evidence packet through independent proof and delivery handoff at final project acceptance. That pending test does not block Milestone 60, Milestone 62 mechanism implementation, or later development unless a later capability genuinely requires observed live-runtime behavior; it remains required before declaring live engineering-learning activation complete.

### Conditional — scale only after the delivery loop works

| ID | Outcome | Completion gate | Dependencies / non-goals |
| --- | --- | --- | --- |
| **61 — Greenfield builder** | **Complete:** Bootstrap a new project from an evidence-informed charter, stack decisions, and a vertical first slice through the existing delivery loop. | Deterministic safe scaffolding, profiler transition, accepted-contract lineage, isolated execution, fresh verification, and generated-project baseline gates pass. | Requires proven 50–60 flow; research is used only when the decision router requires it. No autonomous deployment. |
| **62 — Engineering learning** | Implement a separate dormant registry that can learn from attributable review, rework, runtime, and user outcomes without contaminating research learning. | Deterministic schemas, provenance separation, lifecycle/safety tests, and bounded dormant policy compile pass. Live activation remains deferred to final Claude Code project acceptance. | Requires 59 for the future live activation path; synthetic fixtures and the baseline are mechanism evidence only. |
| **63 — Distribution architecture** | Safely install, update, and remove the system across target repositories. | Project data and security-sensitive agent semantics survive lifecycle operations. | Requires a stable project-local product first. |
| **64 — Engineering value benchmark** | Demonstrate real value on brownfield and greenfield tasks using the established harness. | It improves first-pass criteria success and rework against a plain-Claude baseline while preserving safety and economic viability. | Requires representative delivery evidence. |

## Decision gates and measures

Each milestone proposal must name its expected benefit, affected truth plane, risks, alternatives, required evidence, and rollback path. Promotion requires the applicable gates below.

| Measure | Why it matters |
| --- | --- |
| Evidence-to-requirement lineage coverage | Shows whether material decisions remain explainable. |
| Acceptance-criterion coverage with observed proof | Distinguishes planned verification from actual verification. |
| First-pass independent acceptance and repair rounds | Measures delivery quality and rework. |
| Human-friction ratio | Confirms the system resolves factual questions before escalating preferences. |
| Complexity delta | Counts dependencies, services, configuration, public APIs, and abstractions introduced. |
| Regression rate and delivery latency | Protects existing behavior while measuring practical throughput. |
| Context cost per accepted task | Prevents a large, expensive coordination layer from masking weak outcomes. |

The north-star measure is **verified acceptance criteria satisfied per unit of human attention**. Token count, agent count, and lines of code are diagnostic measures, not success criteria.

## Guardrails and explicit exclusions

- The orchestration product adds no external agent runtime, web server, database, or GitHub Issues blackboard. A user application's accepted contract may require those components.
- No generic builder swarm or permanent narrative memory as canonical state.
- No automatic conversion of evidence into a product decision or requirement.
- No unvalidated research input, prototype, inferred graph edge, or stale repository profile authorizes a production change; required prototype evidence resolves draft-contract uncertainty before execution authorization.
- No new dependency before the repository capability, standard library, native platform, and installed-dependency options are assessed.
- No implementation agent self-approval, autonomous merge, or autonomous deployment in the initial product.
- No mandatory graph tool, strict source-read hook, or universal production checklist.

## Review cadence and change control

Review this roadmap after each completed milestone and after any material platform change in Claude Code. Update it when evidence changes; do not silently re-number, expand, or de-scope a milestone. Record the decision, alternative, affected files, and validation evidence in [`research-swarm-progress.md`](research-swarm-progress.md). Completed work belongs in that progress record, not in the future-facing roadmap table.

## Near-term decision

Milestones 46 and 54–60 are complete. The executor remains prohibited from merging or deploying, and Milestone 64 must compare it to the recorded plain-Claude baseline before making value claims.
