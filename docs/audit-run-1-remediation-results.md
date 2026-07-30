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
| Archive compatibility/migration | Authorized for Milestone 23 | The tracked corpus has the current valid fixture and intentionally invalid fixtures, but no preserved pre-remediation archive or tested migration. Milestone 23 is authorized to add archive contract versioning and explicit legacy rejection. |

## Archive and documentation review

The required archive is documented in `research/README.md` and the specification: `manifest.json`, `plan.json`, five JSONL ledgers, `conflicts.json`, `coverage-gaps.json`, `semantic-validation.json`, `report.md`, `report-map.json`, and `validation.json`. The specification examples now use canonical `src_`, `clm_`, and `ver_` IDs. README permission wording is accurate.

Repository searches found no actionable TODO/FIXME markers, stale archive filenames, or placeholder runtime URLs. Historical audit text and schema references are intentionally retained where they describe the original finding or a standards URI.

## Runtime smoke review

Claude Code 2.1.220 is installed and current official workflow documentation was checked. The original bounded valid invocations reached the `research-swarm` workflow command but did not start; the serializer blocker is now fixed. The following remain unverified runtime-acceptance invocations:

* Light: one worker, one source/claim/target limit, `verification: "none"`.
* Deep: one worker, one source/claim/target limit, `verification: "all-material"`.

`claude --print --permission-mode dontAsk` denied the Workflow tool. The bypass retry initially failed before launch because the local permission handler rejected the serialized workflow script for hidden control characters. The workflow had mixed CRLF and LF line endings; normalizing it to LF-only removed every CR byte. A bounded `depth: "invalid"` invocation then launched the exact production workflow, returned its deterministic `PLAN_FAILED` result, spawned zero agents, and created no artifacts. This proves the serializer and planning-entry path, but not a valid Light or Deep archive, so runtime evidence for canonical IDs, verifier evidence, discarded-claim linkage, gaps, semantic results, repair events, report anchors, and safe paths remains incomplete.

## Conclusion

Offline deterministic ledger, contract, anchoring, hardening, resource-control, repair-route, and diagnostic checks pass. The workflow serializer blocker is fixed, but offline verification and the invalid-depth launch diagnostic do **not** certify a production beta or a valid runtime archive. Milestones 23–24 remain for archive-version policy and bounded current-runtime Light and Deep acceptance. Hard permission isolation remains a documented platform limitation, not a completed control.

## Residual risks and authorized follow-up

| Milestone | Authorized scope | Acceptance evidence still required |
| --- | --- | --- |
| 22 | Execute bounded ledger, verification, and structural repair routes. | Complete: deterministic route and global-cap regression tests pass. |
| 23 | Add archive contract versioning and explicit legacy rejection. | Supported-version validation and actionable rejection fixtures. |
| 24 | Run bounded current-runtime Light and Deep acceptance. | One valid archived run at each depth, inspected and accepted by the deterministic validator. |

Offline tests cannot establish runtime behavior. The serializer diagnostic does not validate worker routing, verification, persistence, report anchors, or archive-safe paths, and neither a valid Light nor Deep archive currently exists. Role write isolation remains behavioral rather than hard permission isolation.
