# Research Swarm Optimization Plan

## Scope and objective

Milestone 36 is documentation-only. It proposes no runtime, schema, settings, agent, hook, or behavior change.

The objective is to reduce total workflow agents, tokens, and repeated context while preserving or improving validated research quality: canonical schemas, evidence and provenance, risk-based verification, Deep all-material verification, the two-round repair ceiling, adaptive-learning safety boundaries, archive compatibility, and deterministic validation all remain non-negotiable.

The current workflow is deliberately bounded: Light/Standard/Deep cap workers, canonical claims, and verifier concurrency at 2/8/2, 3/12/3, and 4/20/4; explicit structured limits still reach the hard maxima. It uses isolated `pipeline()` fanout only for independent workers and verification, deterministic claim caps and escalation, a workflow-wide two-repair limit, and one persistence writer. Existing runtime acceptance remains incomplete: Milestone 24 has no validated current-runtime Light or Deep archive, and Milestone 35's runtime gate remains open.

## Measurement before any optimization

Use comparable successful archived runs at the same query class, depth, verification policy, freshness setting, and learning mode. Record each run before changing a limit or route:

| Field | Current evidence | Decision rule |
| --- | --- | --- |
| Initial workers | plan `worker_count` | Do not lower a depth baseline unless retained-claim and coverage results are non-inferior. |
| Verifier agents | selected verification targets and chunks | Deep remains all-material; risk-based reductions need equal-or-better verified coverage. |
| Repair agents | `repair-events.jsonl` agent counts | Never exceed the two-round ceiling. |
| Total workflow agents | phase counts | Prefer fewer agents only when archive and semantic validation still pass. |
| Retained claims | archive manifest/ledger | Compare materiality, confidence, provenance, and independence—not raw count alone. |
| Coverage gaps | `coverage-gaps.json` | No increase in unresolved critical/high gaps. |
| Semantic-validation status | `semantic-validation.json` | Must remain `pass`. |
| Archive-validation status | `validation.json` plus `validate-research-run.mjs` | Must remain valid. |
| Per-phase tokens, elapsed time, and agent detail | `/workflows`, when available | Use for attribution only; no documented persistent workflow-token export exists. |

Treat a change as successful only if deterministic and semantic validation pass, the archive validates, protected quality measures are non-inferior, and the measured agent/token reduction is repeatable. Fixed-ledger replay cannot prove retrieval improvement; retrieval-affecting changes need current-runtime archive evidence before promotion.

## Playbook mapping and decision register

| Playbook recommendation | Classification | Repository-specific decision |
| --- | --- | --- |
| Fan out independent work | already implemented | Workers and verifier chunks use bounded `pipeline()` fanout. Measure whether each depth's configured fanout earns its cost; do not remove required independent verification. |
| Reduce high fanout | defer pending measurable evidence | Test fewer workers only against comparable validated archives. Preserve depth escalation and Deep all-material verification. |
| Route simple work to cheaper models | defer pending valid-contract runtime evidence | Runtime retry exhaustion was traced to generated schema corruption, so it cannot establish model reliability. Keep the current Sonnet routing temporarily; re-evaluate only after valid contracts are proven live. Planning and synthesis retain intentional session-model inheritance. Do not add a global `CLAUDE_CODE_SUBAGENT_MODEL` override because it supersedes every stage route. |
| Use a stronger model for difficult reasoning | operational guidance only | Select the session model by query risk and depth; do not encode pricing or undocumented model assumptions into the workflow. |
| Minimize persistent context | implement now | Keep this plan and project instructions concise; keep volatile run data in workflow variables and archives, not persistent instructions. No new runtime surface is required. |
| Make prompts and payloads smaller | already implemented | Bounded plans, source/claim limits, split normalizer outputs, targeted repair payloads, and retained-ledger-only synthesis already constrain payloads. Future changes must retain necessary evidence, counter-evidence, and repair context. |
| Move deterministic work out of agents | already implemented | JavaScript controls caps, ranking, policy merging, escalation, repair selection, structural checks, and archive validation. Keep factual judgment, adversarial verification, and semantic review agent-owned. |
| Add more hooks for enforcement or telemetry | not applicable to this repository | The recovery-only Stop hook is bounded and best-effort. Per-prompt, per-tool, and agent hooks would multiply latency and are not needed for this workflow. |
| Reduce adaptive-learning overhead | implemented | `off` avoids learning agents, `evaluate` retains only quality evaluation, and `adapt` alone selects/ registers policy. The friction evaluator runs only for deterministic lifecycle anomalies; recovery skips already registered manifests. Preserve exactly-once registration, constitution checks, redaction, archive immutability, and pause/rollback behavior. |
| Add MCP tools or LSP | not applicable to this repository | Native web research and Node validation meet the runtime need; no MCP configuration exists. IDE LSP diagnostics do not improve external evidence research. Reconsider only for a concrete recurring retrieval deficit with measured benefit. |
| Defer seldom-used MCP tools | operational guidance only | If an MCP server is later authorized, rely on Claude Code's documented Tool Search/deferred loading and measure tool-selection reliability. Do not add MCP merely to optimize context. |
| Manually tune prompt-cache TTL or prefixes | not applicable to this repository | Claude Code caching is automatic; no verified workflow interface here exposes the playbook's cache-TTL controls. Preserve stable project instructions and avoid speculative cache configuration. |
| Compact at phase boundaries | operational guidance only | Let normal compaction operate; do not add compaction hooks. A `PreCompact` hook can block and adds overhead. Revisit only when `/context` or `/workflows` shows recurring context pressure. |
| Add observability | implement now | Use the available `/workflows` phase count, token total, elapsed time, and agent details alongside archived quality fields. First establish the baseline table above; implementation instrumentation is a later, separately authorized change. |

## Ordered experiment backlog

1. Establish successful current-runtime Light and Deep version-2 archive baselines. This is prerequisite evidence, not closure of Milestone 24 or 35.
2. Compare learning modes for equivalent runs, starting with `off` versus `evaluate`; retain `adapt` safeguards and only optimize recovery scanning after its measured overhead is material.
3. Compare one lower worker/verifier setting per non-Deep depth. Reject changes that worsen retained evidence, coverage gaps, semantic validation, or archive validation.
4. Measure the implemented stage-class routing against comparable validated archives before changing aliases. Do not use a global subagent-model override for selective routing.
5. Consider implementation telemetry only if `/workflows` cannot provide sufficient repeatable measurements. Any telemetry must be bounded, redacted, archive-compatible, and deterministic-validation-safe.

## Interface evidence and limits

Current official [dynamic-workflow documentation](https://code.claude.com/docs/en/workflows) verifies project workflows, script variables for intermediate state, `agent()`, `pipeline()`, inline schemas, bounded parallelism, and `/workflows` phase telemetry. Documented per-invocation model aliases route stages; `CLAUDE_CODE_SUBAGENT_MODEL` has precedence over that selection. It does not establish named project-agent routing or per-call tool restrictions; role write isolation remains behavioral. Current [settings documentation](https://code.claude.com/docs/en/settings) supports the existing advisory `workflowSizeGuideline: "small"`. Current [hooks documentation](https://code.claude.com/docs/en/hooks) supports the existing project Stop hook and documents hook overhead/blocking behavior. Current [MCP documentation](https://code.claude.com/docs/en/mcp) documents deferred Tool Search for configured MCP servers, not a reason to add one.

Claims in the supplied playbook about exact pricing, TTL mechanics, cache thresholds, nesting limits, background-agent limits, and beta tool changes are not used as implementation facts because they were not verified against the current Claude Code interfaces. The plan uses the documented workflow limit of 16 concurrent agents and 1,000 total agents as the external ceiling; repository limits are intentionally tighter.

## Guardrails

Do not optimize by weakening canonical schemas, provenance, material counter-evidence, risk-based verification, Deep correctness, deterministic validation, or archive structure. Do not trade the two-round repair limit for more retries. Do not add an external orchestrator, database, web server, background daemon, dependency, or active GitHub-issue blackboard. Do not infer production readiness from a documentation plan.

## Milestone 45 disposition

Offline acceptance on 2026-08-01 passed `npm ci`, generated-contract drift checks, all 88 deterministic tests, current and legacy valid-fixture validation, required invalid-fixture rejection, benchmark checks, workflow serialization/syntax, hook/script syntax, hook diagnostics, and whitespace checks. Static review corrected the ledger-repair path so a Deep run verifies every changed or newly admitted canonical claim before adjudication, while existing verified claims retain their immutable events. The workflow appends one common no-nested-delegation instruction to every dynamic agent prompt.

Runtime acceptance remains incomplete. Claude Code 2.1.220 and the documented workflow interface were available, but the one bounded Light attempt was stopped before execution by the runtime's `Review dynamic workflow before running` approval gate. It produced no archive or `/workflows` telemetry; Deep was not attempted to avoid a retry loop. No token, elapsed-time, agent-count, or quality-savings claim is made from this result, and no further resource-default tuning is justified without comparable validated runtime evidence.
