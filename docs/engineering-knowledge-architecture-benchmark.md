# Pre-M64 engineering-knowledge architecture review

## Decision

**GO to begin Milestone 64; do not claim product value yet.** The deterministic representative suite passes, safety/provenance boundaries remain intact, and planning-stage stage savings are measurable. Live Claude Code retrieval quality, context/tokens, latency, agent counts, human attention, downstream acceptance proof, repairs, and cost remain unavailable and must be measured by M64.

## Representative comparison

The same ten cases from [`engineering-knowledge-baseline.md`](engineering-knowledge-baseline.md) were routed through the current tiered architecture. The historical comparison is limited to the reproducible baseline stage inventory: repository-only cases used inspection; every external-fact case used the full research path. It is not a replay of live retrieval.

| Observable | Baseline | Tiered architecture | Result |
| --- | ---: | ---: | --- |
| Cases | 10 | 10 | equal |
| Route inventory | 3 repository / 7 full research | 3 T0 / 1 T1 / 2 T2 / 1 T3 / 3 T4 | deterministic route pass |
| Planned stages | 73 | 43 | 41.1% lower |
| Tokens/context, latency, agents, cost | unavailable | unavailable | not estimated |
| Retrieval relevance, authoritative coverage, claims consumed | unavailable | unavailable | not estimated |
| Verification strength, gaps, repairs, human attention | unavailable | unavailable | not estimated |
| Downstream acceptance-criterion proof | unavailable | unavailable | not estimated |

T4 remains the path for broad, high-consequence, or unresolved-conflict needs. T0 uses repository intelligence; T1 handles a bounded authoritative lookup; T2 handles focused research; T3 adds independent verification. Every route remains evidence-only and non-authorizing.

## Acceptance audit

- Correctness: all tier routes and focused evidence contracts pass deterministic tests; live source correctness is deferred to M64.
- Safety and provenance: conflict escalation, non-authorizing evidence, archive lineage, dormant learning, and independent verification checks pass.
- Efficiency: 43 planned stages versus 73 in the historical inventory; no token, latency, or agent saving is claimed.
- Residue: no obsolete entrypoint, intelligent hook, persistent Graphify artifact, duplicated universal research rule, or incompatible distribution asset was found. Graphify remains optional and non-authorizing; its installed `affected` and `benchmark` commands remain incompatible with its generated `edges` output.
- Learning: engineering learning remains dormant; fixture and baseline evidence cannot activate it.

## M64 acceptance still required

Run comparable bounded Claude Code cases for T0, T1, T2, T3, T4, and optional Graphify where selected. Capture only exposed telemetry and observed evidence: route correctness, source authority/relevance, verification, consumed claims, payload/context, agents, latency, gaps, acceptance proof, repairs, and human attention. Do not estimate missing values or turn fixture results into plain-Claude product-value claims.

## Evidence

The reproducible record is emitted by `npm run benchmark:engineering-knowledge`. The deterministic suite and full repository checks are the authority for this review; no live Claude Code run was performed.
