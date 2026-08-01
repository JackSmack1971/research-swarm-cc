# Research Swarm Optimization Benchmark

## Purpose and baseline

This benchmark measures verified research efficiency, not just fewer agents. The pre-optimization external usage signal for this program was coarse: recent use was dominated by subagent-heavy sessions, and research-swarm subagents were the largest identified contributor. It is baseline context, not an additive token ledger or proof that any particular stage is wasteful.

Use comparable successful runs: same query class, requested/effective depth, verification policy, freshness, and learning mode. A fixture or fixed-ledger replay checks only structural behavior; it cannot prove retrieval quality improved.

## Measurements

For each baseline/candidate pair record requested and effective depth; initial workers; gap-fill workers; verification targets and verifier agents; repair and evaluator agents; total workflow agents; sources; admitted, retained, and discarded claims; unresolved coverage gaps/conflicts; semantic-validation result; deterministic archive-validation result; elapsed time; and per-phase/per-agent tokens when available.

`node scripts/benchmark-research-optimization.mjs <run-directory>` emits reproducible archive facts and reruns deterministic archive validation. It deliberately reports `null` for data the archive does not preserve: requested depth, gap-fill workers, verification targets, and total workflow agents. It does not invent token or elapsed-time data.

Automatically collectible archive metrics are plan depth/worker count/policy, source and claim counts, verification-event count, repair `agent_count`, model evaluator identities, unresolved gaps/conflicts, semantic validation, recorded validation, and a fresh deterministic validation result. Capture the null fields, elapsed time, and per-phase/per-agent tokens manually from Claude Code `/workflows`; retain the telemetry alongside the benchmark record, not inside the archive contract.

## Offline structural paths

`predictAgentPath()` in `scripts/lib/research-optimization-benchmark.mjs` predicts the successful workflow path from configuration without research or web calls. It counts the workflow's one planner, three initial normalization calls, two adjudication calls, synthesizer, semantic validator, persistence writer, configured workers/verifiers, actual gap-fill and repair agents, evaluator agents, and the two `adapt` policy calls. A gap-fill path adds its incremental normalizer. The test covers representative Light, Standard, and Deep paths; Deep rejects a path with fewer verifier agents than admitted claims.

Current defaults are Light `2`, Standard `3`, and Deep `4` initial workers. For the historical comparison, use the pre-Milestone-39 defaults Light `2`, Standard `5`, Deep `8` from the prior workflow revision, with the same non-worker limits and comparable inputs. Do not infer a historical run from current archives.

## Gates and decision rule

A cheaper configuration is unacceptable when either archive validation fails, semantic validation is not `pass`, a material gap/conflict is hidden, Deep fails all-admitted verification, or supported-claim coverage materially drops. Compare retained claims by materiality, evidence provenance, and independence—not raw count. Do not increase unresolved critical/high gaps or conflicts, repair rounds, or deterministic defects.

The target, not a mandate, is at least approximately 25% fewer agents and tokens on representative Standard runs than the historical defaults while all gates remain equal. Token reduction can be claimed only when comparable `/workflows` telemetry exists.

## Run procedure

1. Capture the candidate and historical/current baseline `/workflows` views after each comparable run: elapsed time, phase tokens, agent tokens, requested depth, gap-fill count, targets, and total agents.
2. Run `node scripts/benchmark-research-optimization.mjs <run-directory>` for each validated archive and save its JSON with that manual telemetry.
3. Compare the same query class and settings. Reject the candidate on any gate failure; otherwise calculate agent/token reduction as `(baseline - candidate) / baseline`.
4. For an offline configuration check, run `node --test tests/research-optimization-benchmark.test.mjs`. It predicts only paths and validates no research claims.

No token accounting is synthesized in Node because Claude Code does not expose it through this archive interface.

## Milestone 45 result

Offline acceptance passed the structural predictor and valid version-2 fixture collector, but neither is a comparable retrieval run. A bounded Light runtime attempt on 2026-08-01 stopped at Claude Code's `Review dynamic workflow before running` approval gate before any workflow agent ran; no archive, `/workflows` telemetry, or Deep result exists. Therefore measured agent/token savings and runtime quality comparison are **not available**. Keep the current lean defaults pending an approved comparable Light and Deep run.
