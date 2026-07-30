# Audit run 1 remediation plan

## Scope and authority

This is Milestone 12. It authorizes planning only; no workflow, schema, agent, validator, fixture, or runtime implementation changes belong here. The local checkout initially omitted `docs/audit-run-1.md`; the original audit has been restored verbatim from the repository's remote `main` version, which audited commit `a98733802697e9a8c8522c3abfda2af6b386d825`.

Native Claude Code dynamic workflows remain the runtime. Per-role write isolation is behavioral, not hard permission isolation, until Claude Code documents named-agent routing or per-call tool restrictions. This is an accepted platform limitation, not a rejected audit recommendation.

## Architectural decisions and compatibility

| Decision | Rationale | Compatibility and migration rule |
| --- | --- | --- |
| Canonical JSON Schemas are the single contract source. | The audit found drift among schemas, inline workflow contracts, validator logic, and agent prose. | Generate workflow inline schemas and schema-derived validator data from canonical files; add a drift check. |
| Ajv 8 is the sole approved new dependency. | Draft 2020-12 schema enforcement needs a real validator; Ajv is contract enforcement, not orchestration. | No other dependency is authorized. Existing fixture validation must continue to run. |
| Preserve complete ledger history. | Discarded claims can carry decisive verification and conflict history. | Add archive fields/artifacts compatibly or ship a documented, tested migration before declaring the new layout required. |
| Anchor report-map units to report text. | Claim IDs alone do not prove mapped prose appears in `report.md`. | Existing maps need compatible default handling or a migration that inserts/records stable anchors. |
| Restrict archive output beneath `artifacts/research-runs`. | Arbitrary caller paths can escape the intended archive root. | Preserve the default output location; explicitly reject unsafe legacy values with actionable diagnostics. |

## Audit mapping

Every audit heading and recommendation is assigned once below. “Accepted limitation” means it is implemented as accurate behavioral documentation because the requested hard control is not available in the documented runtime.

| Audit heading or recommendation | Milestone | Acceptance condition | Regression evidence |
| --- | --- | --- | --- |
| Overall assessment | 20 | Final acceptance distinguishes verified implementation from remaining platform limitation. | Full regression and smoke-test report. |
| What is done especially well | 20 | Existing planning, provenance, conflict, bounded repair, and one-writer behavior remain covered. | Legacy fixtures and archive compatibility tests pass. |
| Highest-priority findings | 20 | The final gate confirms every priority finding below has its milestone evidence. | Requirement-to-evidence completion audit. |
| Role isolation is not real in the running workflow | 16 | README and rules say behavioral isolation; untrusted-content and session allowlist guidance is present. | Static documentation/rule check. |
| Verifiers cannot contribute new evidence | 14 | Verification events carry new sources/evidence, canonicalized with IDs, locators, provenance, and independence groups before adjudication. | Fixture canonicalizes a verifier-discovered counter-source. |
| Verification events that discard claims are deleted | 13 | All verification events persist and discarded claims link to their disposition events. | Contradicted discarded-claim archive validates with its event retained. |
| Normalizer coverage gaps are dropped | 13 | Each normalized gap reaches adjudication with a retained, resolved, or explicitly disposed state. | Fixture preserves a coverage gap through archive validation. |
| Workflow schemas and canonical schemas drift | 15 | Ajv validates archives against canonical schemas; workflow inline schemas are generated and drift-checked. | Invalid enum and undeclared-property fixtures fail; contract-sync check passes. |
| Report map is not tied to actual report text | 15 | Each report-map unit has one stable report anchor and matching text/hash. | Missing, orphaned, or altered anchor fails validation. |
| Important operational concerns | 16 | Runtime safeguards below are applied without claiming unavailable hard role permissions. | Runtime-hardening regression suite. |
| Prompt injection from sources | 16 | Shared rule treats all research content as untrusted data and forbids source-driven commands, edits, secret disclosure, or role changes. | Static rule check. |
| Arbitrary output root | 16 | Output path is fixed or safely constrained below the archive root; absolute, traversal, drive, and null-byte paths fail. | Deterministic unsafe-path cases fail. |
| Run size is not bounded by `maxWorkers` | 16 | Worker, source, canonical-claim, and verification-target budgets cap fan-out deterministically by depth. | Overflow selection/budget test. |
| Smaller logic issues | 17 | Policy and escalation controls below are deterministic; repair and diagnostic controls remain separately gated. | Control-flow regression suite. |
| Planner verification policy is discarded | 17 | User and planner policies merge by documented deterministic precedence. | Policy-precedence unit tests. |
| Escalation triggers are dead metadata | 17 | Post-normalization conflicts, gaps, low confidence, missing primary evidence, and risk signals can escalate depth within budgets. | Escalation decision tests. |
| Repair is report-only | 18 | A repair classifies report, ledger, verification, or structural defect; at most two targeted rounds run. | Stubbed repair-route and cap tests. |
| Failure diagnostics are swallowed | 19 | Safe failure output includes stage and stable code without secrets or full prompts. | Stage-failure payload tests. |
| Semantic review and repair history are not archived | 13 | Archive persists semantic-validation and repair-event records without altering conclusions. | Fixture validates both history artifacts. |
| Recommended completion order | 13 | Milestones execute in this plan's dependency order, with Milestone 20 as the final gate. | Progress table and predecessor checks. |
| Bottom line | 20 | Final assessment confirms complete ledger, coverage propagation, contract enforcement, report anchors, and accurately scoped role isolation. | Full regression plus Claude Code smoke test when available. |

## Milestone dependency order

| Milestone | Scope | Exit condition |
| --- | --- | --- |
| 13 | Complete historical ledger and coverage propagation. | Archive preserves all verification, conflicts, coverage gaps, semantic review, and repairs. |
| 14 | Integrate verifier-discovered evidence. | Augmented canonical ledger reaches adjudication. |
| 15 | Enforce contracts and report anchoring. | Canonical schemas govern validation and every map unit is text-anchored. |
| 16 | Runtime hardening. | Behavioral-isolation docs, injection defenses, safe output paths, and resource budgets are enforced. |
| 17 | Planning control flow. | Verification policy merges and escalation decisions execute deterministically. |
| 18 | Targeted repairs. | Bounded repair can correct the appropriate evidence or report layer. |
| 19 | Failure diagnostics. | Failures retain safe, actionable stage/code information. |
| 20 | Compatibility and final smoke testing. | Fixtures/archived runs are preserved or migrated, all tests pass, and Claude Code smoke behavior is recorded accurately. |

## Deferred platform limitation

Hard named-role tool isolation is deferred only because current documented Claude Code dynamic workflows do not expose named-agent routing or per-call tool restrictions. The project must not describe prompt constraints as technical enforcement. If Claude Code documents either capability, evaluate it as a new explicitly authorized remediation milestone rather than silently changing this plan.

## Milestone 20 acceptance disposition

See `docs/audit-run-1-remediation-results.md` for the requirement-by-requirement evidence. The deterministic remediation gates pass, but this plan does not authorize a production-beta claim: targeted ledger/verification/structural repairs, pre-remediation archive compatibility or migration evidence, and a successful Claude Code smoke archive remain outstanding. Role isolation remains the documented platform limitation above.
