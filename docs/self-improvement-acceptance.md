# Adaptive self-improvement acceptance — Milestone 35

## Disposition

**Not production-ready.** The deterministic implementation and fixture acceptance gates pass, but no current Claude Code Light or Deep run has produced a valid version-2 archive. The bounded Light invocation on 2026-07-31 exceeded the 124-second caller limit without an archive; Deep was not started. This document keeps runtime and fixture evidence separate.

## Milestone 25–35 reconciliation

| Milestone | Delivered evidence | Acceptance state |
| --- | --- | --- |
| 25 | Constitution, protected core, ignored learning root | Passed offline |
| 26 | Version-2 archive, lesson, policy, and evaluation contracts; v1 validation retained | Passed offline |
| 27 | Fixed-format completed-run quality/friction evaluation | Passed offline |
| 28 | Atomic registry, bounded compiler, relevant policy injection | Passed offline |
| 29–30 | Independent promotion, provisional-first lifecycle, fixed two-counterexample rollback threshold | Passed offline |
| 31–32 | Replay quality comparison, canary assignment, promotion and rollback | Passed offline |
| 33 | Review-only durable patch proposals | Passed offline |
| 34 | Stop-hook recovery and learning controls | Passed offline |
| 35 | Current-runtime Light and Deep version-2 archive acceptance | Not met |

## Deterministic acceptance

| Requirement | Evidence |
| --- | --- |
| Every valid v2 archive has an evaluation; v1 stays read-only-valid and cannot learn | `research-validation.test.mjs`; `valid-run` and `valid-run-v2` validation |
| Lessons begin provisional; only relevant active lessons are compiled; irrelevant and unsafe policy is excluded | `research-learning.test.mjs` |
| Promotion uses permitted, independent evidence; generated policy remains capped | lifecycle and compiler tests |
| Canaries, critical regression rollback, missing snapshots, and cooldown work | `research-policy-canary.test.mjs` |
| Core changes remain review-only proposals and state is ignored by Git | constitution, candidate tests, `.gitignore` |
| Live queries, reports, sources, and private feedback are excluded from directives | learning, feedback, path, and validation tests |
| No model-weight training or per-run improvement guarantee is claimed | constitution and README |

The adversarial suite covers untrusted webpage/rule-editing requests, a universal lesson, conflicting lessons, citation-support regression, duplicate IDs, corrupt state, concurrent registration, stale locks, oversized policy, a self-lowered rollback threshold, constitution modification, contradictory user correction, critical canary regression, missing snapshots, recursive Stop input, paused learning, and no useful lesson. The fixed rollback threshold now rejects `1` in the canonical schema and ignores attempted in-memory lowering.

## Runtime evidence

The attempted command was a one-worker, one-source, one-claim Light run of `What is the capital of France?` with `learning: "adapt"` and no permission bypass. Claude Code `2.1.220` launched the CLI but the caller timed out after 124 seconds. No archive or trace was persisted. This is failed runtime evidence, not a product failure conclusion. A Deep run remains required only after a Light v2 archive validates.

Dynamic-workflow role write isolation is still behavioral: the documented workflow interface does not provide named project-agent routing or per-call tool restrictions. This limitation remains in force even if the runtime archive gate later passes.

## Required completion gate

Before a production-ready claim, run bounded benign Light and Deep tasks in a current Claude Code session; validate both resulting version-2 archives; demonstrate one provisional lesson, relevant next-run policy injection, unrelated-policy exclusion, permitted evidence promotion (fixtures are sufficient for repeated-run lifecycle evidence), and rollback. Re-run this document’s deterministic commands and preserve the resulting acceptance evidence without committing generated archives or learning state.
