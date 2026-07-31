# Audit Run 1 remediation results

## Final acceptance review

This Milestones 20–21 review compares the original Audit Run 1 findings with the current implementation. It distinguishes three evidence tiers: deterministic offline code and test checks passed; the workflow serializer and planning-entry blocker are fixed; and valid current-runtime Light and Deep archives remain unverified. It does not claim hard role isolation: native Claude Code dynamic workflows still have no documented named-project-agent routing or per-agent tool allowlists, so role write isolation is behavioral rather than technically enforced.

| Original audit finding | Disposition | Evidence |
| --- | --- | --- |
| Role isolation is not real | Mitigated platform limitation | `research/README.md`, `.claude/workflows/research-swarm.js`, and `docs/research-swarm-progress.md` accurately describe behavioral isolation and session-level allowlists. |
| Verifiers cannot contribute evidence | Implemented | Verifier-local sources/evidence are canonicalized before adjudication in `.claude/workflows/research-swarm.js`; canonical schemas and validator enforce them. |
| Discard-triggering verification is deleted | Implemented | All events persist; discarded claims link verification events; `scripts/lib/research-validation.mjs` validates both retained and discarded references. |
| Coverage gaps are dropped | Implemented | Adjudication now receives `boundedNormalized.coverage_gaps`, including canonical-budget overflow gaps, and persistence archives the adjudicated result. |
| Contract drift | Implemented | `npm run contracts:check` verifies generated inline workflow contracts; Ajv validates archives against canonical schemas. |
| Report map is detached from prose | Implemented | Anchored report units and normalized SHA-256 hashes are enforced by `scripts/lib/research-validation.mjs`. |
| Source prompt injection | Implemented | Shared untrusted-content rule is present in workers, verifiers, standards, and every workflow role prompt. |
| Arbitrary archive root | Implemented | `scripts/lib/research-paths.mjs` and workflow path checks restrict output to `artifacts/research-runs` or safe descendants. |
| Unbounded fan-out | Implemented | Depth-aware source, claim, verifier, and gap-worker caps are tested in `tests/research-workflow-controls.test.mjs`. |
| Planner policy and escalation ignored | Implemented | Deterministic policy merging and post-normalization escalation are implemented and tested. |
| Targeted repairs are report-only | Implemented | Ledger repair launches one focused worker then normalizes, readjudicates, and regenerates only affected report units; verification repair appends one immutable verifier event then readjudicates and regenerates affected units; structural repair is constrained to persistence-safe corrections. All share the two-round budget and emit complete audit events. |
| Failure diagnostics are swallowed | Implemented | Workflow returns only stable stage/code diagnostics with the safe run path state. |
| Semantic review and repair history are absent | Implemented | `semantic-validation.json` and `repair-events.jsonl` are required archive artifacts and are validated. |
| Archive compatibility/migration | Implemented for version 1.0.0 | The validator accepts exactly version `1.0.0` and rejects unsupported legacy and future versions without mutation. No migration exists because no genuine pre-remediation archive corpus is preserved. |

## Archive and documentation review

The required archive is documented in `research/README.md` and the specification: `manifest.json`, `plan.json`, five JSONL ledgers, `conflicts.json`, `coverage-gaps.json`, `semantic-validation.json`, `report.md`, `report-map.json`, and `validation.json`. The specification examples now use canonical `src_`, `clm_`, and `ver_` IDs. README permission wording is accurate.

Repository searches found no actionable TODO/FIXME markers, stale archive filenames, or placeholder runtime URLs. Historical audit text and schema references are intentionally retained where they describe the original finding or a standards URI.

## Runtime smoke review

Claude Code 2.1.220 is installed and current official workflow documentation was checked. The original bounded valid invocations reached the `research-swarm` workflow command but did not start; the serializer blocker is now fixed. The following remain unverified runtime-acceptance invocations:

* Light: one worker, one source/claim/target limit, `verification: "none"`.
* Deep: one worker, one source/claim/target limit, `verification: "all-material"`.

`claude --print --permission-mode dontAsk` denied the Workflow tool. The bypass retry initially failed before launch because the local permission handler rejected the serialized workflow script for hidden control characters. The workflow had mixed CRLF and LF line endings; normalizing it to LF-only removed every CR byte. A bounded `depth: "invalid"` invocation then launched the exact production workflow, returned its deterministic `PLAN_FAILED` result, spawned zero agents, and created no artifacts. This proves the serializer and planning-entry path, but not a valid Light or Deep archive, so runtime evidence for canonical IDs, verifier evidence, discarded-claim linkage, gaps, semantic results, repair events, report anchors, and safe paths remains incomplete.

## Milestone 24 runtime attempt

On 2026-07-30, the acceptance environment met its prerequisites: Claude Code `2.1.220`, Dynamic workflows enabled in the active user session, `defaultMode: auto`, an LF-only workflow, current generated contracts, and 41 passing offline tests. The session used the narrow allowlist `Workflow,Agent,WebSearch,WebFetch,Read,Write,Bash(node scripts/validate-research-run.mjs *)`, without `--dangerously-skip-permissions`.

The bounded Light invocation used the required stable France question with one worker, at most two sources and claims, no verification, at most two targets, verifier concurrency one, and one gap-fill worker. Initial traces exposed missing depth limits, JSON-text `args`, and direct clock/random calls rejected by the workflow runtime; the minimal corrections restored planning. Trace `wf_5018c78f-385` reached a worker but was stopped after it exceeded the two-source browsing budget. The corrected trace `wf_fe1ea574-675` reached one consolidated worker and made exactly two web calls, but produced no archive: that worker hit the current session limit, and the next normalizer agent was blocked because its generated output schema was too large for the runtime safety classifier. The workflow now splits normalization into source, claim, and relationship calls with the existing canonical subcontracts; that correction has only passed offline checks because the session is still rate-limited. The print client timed out independently of the completed trace. Deep was not attempted because Light cannot produce an archive. No discarded claims, verifier-discovered evidence, coverage gaps, repairs, report anchors, report-map hashes, or deterministic archive validation exist to inspect; those branches remain covered only by deterministic tests.

The session-level allowlist is still behavioral rather than role-specific: dynamic workflow agents cannot be granted different per-call tools through the documented interface. No unsafe archive path was created, and no permission bypass was used.

## Conclusion

Offline deterministic ledger, contract, anchoring, hardening, resource-control, repair-route, and diagnostic checks pass. Milestone 23 completed archive-version policy. The workflow serializer blocker is fixed, but offline verification and the invalid-depth launch diagnostic do **not** certify a production beta or a valid runtime archive; Milestone 24 remains incomplete. Hard permission isolation remains a documented platform limitation, not a completed control.

## Milestone 24 acceptance status

Milestone 24 is incomplete. Light launched or partially executed, but no validated archive was produced. Deep was not attempted. Current-runtime Light and Deep archive validation remains outstanding. This status is based on runtime traces and the absence of a current archive, and it supersedes any contrary planning assumption.

## Residual risks and authorized follow-up

| Milestone | Authorized scope | Acceptance evidence still required |
| --- | --- | --- |
| 22 | Execute bounded ledger, verification, and structural repair routes. | Complete: deterministic route and global-cap regression tests pass. |
| 23 | Add archive contract versioning and explicit legacy rejection. | Supported-version validation and actionable rejection fixtures. |
| 24 | Run bounded current-runtime Light and Deep acceptance. | One valid archived run at each depth, inspected and accepted by the deterministic validator. |

Offline tests cannot establish runtime behavior. The serializer diagnostic does not validate worker routing, verification, persistence, report anchors, or archive-safe paths, and neither a valid Light nor Deep archive currently exists. Role write isolation remains behavioral rather than hard permission isolation.
