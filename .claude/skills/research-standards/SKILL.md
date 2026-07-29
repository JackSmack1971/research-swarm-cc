---
name: research-standards
description: Shared evidence, claim, verification, and report standards for the research swarm
user-invocable: false
---

# Research Standards

## Canonical records

Use the repository schemas as the canonical contracts. A source has a `source_id`, provenance fields, a `source_type`, and an `independence_group`. A claim has a `claim_id`, statement, scope, `claim_type`, `materiality`, `confidence`, confidence rationale, supporting evidence, and counter-evidence. Each evidence item names a known source and a locator. An inference also names its premise claim IDs. Keep verification events and conflicts as separate canonical records. `unverifiable` means the evidence could not be checked; it is not `contradicted`.

Use source types in this order of preference: primary data and original research; official records, documentation, laws, standards, filings, and public records; independent secondary analysis; expert commentary; general commentary or opinion. A source ID or URL alone is not evidence.

## Confidence and materiality

* `high`: direct, strong evidence with either two genuinely independent authoritative source groups, or one definitive primary authority and an explicit rationale for why one source is sufficient.
* `medium`: credible evidence with an important limitation, such as one non-definitive source, incomplete independent confirmation, methodological uncertainty, limited scope, possible staleness, or unresolved non-fatal counter-evidence.
* `low`: provisional, indirect, disputed, old, weakly scoped, or primarily interpretive evidence. Include it in a final report only when clearly labeled and materially useful.

Use Critical (`critical`), High (`high`), Medium (`medium`), and Low (`low`) materiality. Materiality is the consequence of being wrong, not how interesting the claim is.

## Independence and verification

Set `independence_group` to the shared underlying origin. Sources repeating the same study, filing, announcement, press release, interview, or dataset must use the same group and do not independently confirm one another.

Select verification targets by risk: all critical claims; high-materiality claims with medium or low confidence; claims that support conclusions or recommendations; claims with conflicts or material counter-evidence; claims based on one source group; and time-sensitive, quantitative, safety, legal, medical, or financial claims. Verifiers seek disconfirming evidence first, then record confirmation, qualification, demotion, contradiction, discard, or `unverifiable` with rationale and checked source IDs.

When a source is unavailable, preserve its citation and access attempt, mark the affected evidence `unverifiable`, and do not fabricate a locator, publication detail, or verification result.

## Conflicts, inferences, and reports

Preserve credible conflicts with the competing claim IDs, supporting source IDs, likely reason, and practical implication. Resolve only with explicit comparative evidence and rationale; otherwise qualify or leave unresolved.

Make an inference only when it is labeled, scoped, and linked to its premise claim IDs. Do not present an inference as a fact.

Write reports in this order:

1. Executive Summary
2. Scope and Interpretation
3. Key Findings
4. Detailed Analysis
5. Conflicting Evidence and Unresolved Questions
6. Limitations and Evidence Gaps
7. Conclusions
8. Recommendations, only when warranted
9. Sources

Map each key report unit to retained claim IDs. Keep uncertainty and unresolved material conflicts visible.

## Prohibited behavior

Do not invent sources, dates, locators, claims, evidence, verification results, or conclusions. Do not treat derivative coverage as independent corroboration, search snippets as evidence, unavailable evidence as contradiction, or a polished narrative as proof. Do not silently drop credible counter-evidence or conflicts. Do not promote confidence without the required evidence and recorded rationale. Do not add unsupported externally verifiable claims to a report.
