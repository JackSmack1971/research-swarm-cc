# Audit Run 1 remediation results

## Final acceptance review

This Milestone 20 review compares the original Audit Run 1 findings with the current implementation. It does not claim hard role isolation: native Claude Code dynamic workflows still have no documented named-project-agent routing or per-agent tool allowlists, so role write isolation is behavioral rather than technically enforced.

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
| Targeted repairs are report-only | Intentionally deferred | The workflow records ledger, verification, and structural repair classifications, but only report repair executes. Implementing those repair routes would be a new workflow-control change; do not call the project a production beta until an explicitly authorized milestone implements and tests them. |
| Failure diagnostics are swallowed | Implemented | Workflow returns only stable stage/code diagnostics with the safe run path state. |
| Semantic review and repair history are absent | Implemented | `semantic-validation.json` and `repair-events.jsonl` are required archive artifacts and are validated. |
| Archive compatibility/migration | Intentionally deferred | The tracked corpus has the current valid fixture and intentionally invalid fixtures, but no preserved pre-remediation archive or tested migration. Compatibility with pre-Milestone-13 archives remains unproven. |

## Archive and documentation review

The required archive is documented in `research/README.md` and the specification: `manifest.json`, `plan.json`, five JSONL ledgers, `conflicts.json`, `coverage-gaps.json`, `semantic-validation.json`, `report.md`, `report-map.json`, and `validation.json`. The specification examples now use canonical `src_`, `clm_`, and `ver_` IDs. README permission wording is accurate.

Repository searches found no actionable TODO/FIXME markers, stale archive filenames, or placeholder runtime URLs. Historical audit text and schema references are intentionally retained where they describe the original finding or a standards URI.

## Runtime smoke review

Claude Code 2.1.220 is installed and current official workflow documentation was checked. Both bounded smoke invocations reached the `research-swarm` workflow command but could not start it:

* Light: one worker, one source/claim/target limit, `verification: "none"`.
* Deep: one worker, one source/claim/target limit, `verification: "all-material"`.

`claude --print --permission-mode dontAsk` denied the Workflow tool. Retrying with `--permission-mode bypassPermissions --dangerously-skip-permissions` failed before launch because the local permission handler reported that the serialized workflow script contained unrenderable control characters. A byte scan found no literal control bytes outside tab, CR, and LF in `.claude/workflows/research-swarm.js`. No archive or workflow trace was created, so there is no runtime evidence for canonical IDs, verifier evidence, discarded-claim linkage, gaps, semantic results, repair events, report anchors, or safe paths in this milestone.

## Conclusion

The deterministic ledger, contract, anchoring, hardening, resource-control, and diagnostic gates pass. This review does **not** certify a production beta: targeted non-report repairs, historic archive compatibility/migration, and successful current-runtime smoke tests remain required. Hard permission isolation remains a documented platform limitation, not a completed control.
