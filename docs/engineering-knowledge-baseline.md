# Historical engineering-knowledge path baseline

## Scope

This is the pre-redesign historical baseline, not the current route. The benchmark is offline and deterministic: it exercises the former uncertainty router against ten representative question classes and inventories the stages documented before the tiered Evidence Router. It does not run Claude Code, retrieve live sources, or claim quality, latency, or token savings. The current comparison is in [`engineering-knowledge-architecture-benchmark.md`](engineering-knowledge-architecture-benchmark.md).

Run it with:

```text
node scripts/audit-engineering-knowledge.mjs
node --test tests/engineering-knowledge-benchmark.test.mjs
```

## Benchmark result

The fixture is [`tests/fixtures/engineering-knowledge-benchmark/suite.json`](../tests/fixtures/engineering-knowledge-benchmark/suite.json). The current deterministic router sends 3/10 cases to `repository_inspection` and 7/10 to `research_evidence`:

| Class | Current route | Current stage inventory | Engineering-useful result | Observable cost |
| --- | --- | --- | --- | --- |
| Repository-only fact | repository inspection | profile or direct inspection | anchored repository observation | route only; execution payload/latency unavailable |
| Current library/API question | research evidence | plan → research → normalize → verify → adjudicate → synthesize → semantic validation → persist | authoritative API facts and locators | full swarm path; runtime telemetry unavailable |
| Dependency version choice | research evidence | same full swarm path | compatibility/support evidence plus separate decision rationale | full swarm path; runtime telemetry unavailable |
| CVE/security exposure | research evidence | same full swarm path | advisory, affected range, remediation, conflicts | full swarm path plus high verification burden; telemetry unavailable |
| Migration/breaking change | research evidence | same full swarm path | official migration evidence mapped to repository usage | full swarm path; telemetry unavailable |
| Unfamiliar integration | research evidence | same full swarm path | primary contract and bounded integration facts | full swarm path; telemetry unavailable |
| Cross-file impact | repository inspection | profile or direct inspection | revision-stamped references and tests | route only; cross-artifact execution cost unavailable |
| Code↔docs/config relationship | repository inspection | profile or direct inspection | anchored cross-artifact observations | Graphify benchmark unavailable; execution cost unavailable |
| Broad technology choice | research evidence | same full swarm path | comparative evidence, then human decision | full swarm path plus human gate; telemetry unavailable |
| High-consequence/conflicting external evidence | research evidence | same full swarm path | provenance, verification, conflict and limitation records | full swarm path plus human gate; telemetry unavailable |

The benchmark records `null` for model-facing payload bytes, source/claim counts, elapsed time, and token telemetry because no question-specific Claude Code run or archive exposes those measurements. The stage inventory is not an agent-count claim. For the research workflow, the existing optimization collector documents the known fixed stages and makes worker, verifier, repair, evaluator, total-agent, and token fields unavailable unless manually captured from `/workflows` (`scripts/lib/research-optimization-benchmark.mjs`, `docs/optimization-benchmark.md`).

## Current architecture and duplication

The former route was deterministic in `scripts/lib/decision-router.mjs`: `external_fact` always entered `research_evidence`; it did not distinguish a small current API lookup from a broad, high-consequence conflict. The current adaptive route is implemented in `scripts/lib/adaptive-evidence-router.mjs` and benchmarked in `docs/engineering-knowledge-architecture-benchmark.md`. The historical workflow owned planning, fan-out, normalization, verification selection, verification, adjudication, synthesis, semantic review, bounded repair, and persistence (`.claude/workflows/research-swarm.js`).

That makes the highest-duplication boundary clear: engineering consumes a scoped set of claims, source locators, verification references, conflicts, and gaps, while the current route also constructs and archives a standalone report, report map, discarded-claim ledger, full source/claim ledger, semantic report review, quality evaluation, and repair history. Archive validation and provenance are necessary guarantees; report synthesis and report-specific semantic review are not consumed by the evidence packet itself. They remain useful when a human explicitly asks for a research report, but the audit found no evidence that every engineering question needs them.

The current context-efficiency work narrows executor, verifier, and repair projections but does not change the research workflow's external-fact route or add research telemetry (`scripts/lib/context-projections.mjs`, the `Pre-M64 context-efficiency hardening` progress entry). The existing engineering benchmark measures delivery outcomes, not this knowledge path (`docs/engineering-benchmark.md`).

## Graphify and M49 evidence

The current installed Graphify is 0.8.38. A revision-stamped disposable code-only extraction was reproducible, but it did not beat direct inspection: exact-symbol, cross-file-impact, and architecture queries returned anchored nodes with 25–88% irrelevant node context and roughly 0.6–0.7 seconds query latency, while direct search returned only matching anchors. The installed `affected` and `benchmark` commands failed because the extractor emitted `edges` while those commands require `links`; the code↔config/docs case was not run because no approved semantic backend is available. Graphify is therefore rejected for all four benchmark classes and remains optional, read-only, and non-canonical. T0 routes exact symbols and impact to search/LSP, architecture to the profiler plus targeted search, and code↔config/docs to direct search (`scripts/benchmark-repository-intelligence.mjs`, `docs/research-swarm-progress.md`).

## Ranked opportunities (audit only)

| Rank | Opportunity | Engineering value | Context cost | Safety risk | Why it is only a candidate |
| --- | --- | --- | --- | --- | --- |
| 1 | Measure and classify external-fact depth before invoking the full report path | high: avoids unnecessary report machinery for narrow lookups | high potential reduction; unmeasured | high if verification/provenance is weakened | requires comparable live runs and a contract-preserving design |
| 2 | Reuse a scoped evidence projection for engineering-facing prompts | high: keeps claims, locators, verification, conflicts and gaps | medium reduction; current packet is already scoped | medium: omission could hide counter-evidence | first measure payloads and prove packet completeness |
| 3 | Separate engineering evidence validation from report-only semantic review where safe | medium/high: reduces report-specific work | medium reduction; no live measurement | high: semantic support must not be silently dropped | archive validity and evidence guarantees must remain intact |
| 4 | Add question-class telemetry at the router/workflow boundary | medium: makes cost and quality decisions observable | low implementation cost | low | current `/workflows` telemetry is manual/unavailable in this repository |
| 5 | Keep Graphify dormant unless a future version proves class-specific value | low currently: direct inspection wins the measured classes | no measured reduction | medium: graph edges are derived and must not authorize work | revisit only with a compatible interface or approved semantic backend |

No runtime, service, dependency, database, generic memory, Graphify integration, or new research path was implemented. The T0 fallback was narrowed to direct observation; provenance, verification, archive validity, and the evidence/decision boundary remain unchanged.
