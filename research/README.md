# Research Swarm

Run a structured, auditable public-web research workflow inside Claude Code:

```text
/research-swarm <research question>
```

For example:

```text
/research-swarm What evidence supports and challenges the effectiveness of intervention X?
```

## Requirements and setup

Dynamic workflows require Claude Code 2.1.154 or later. This repository was checked with 2.1.220. The included `.claude/settings.json` uses the documented `workflowSizeGuideline` setting, which requires Claude Code 2.1.219 or later.

Enable **Dynamic workflows** in Claude Code’s `/config` when your plan exposes that setting. It is not enabled by a project `settings.json` key. Public-web research also requires that Claude Code makes `WebSearch` and `WebFetch` available to the worker and verifier roles.

The workflow observes Claude Code’s active permission mode and managed/project policy. Its role definitions restrict workers and verifiers to read-only repository and web tools; only the persistence writer may write an archived run. Permission prompts or denials can still prevent a tool call.

Runs are session-scoped: resume the same Claude Code session to continue a workflow context. The workflow does not pause for or accept mid-run user input; resolve important scope choices before invoking it.

## Structured arguments

The command accepts either a plain query or an object with these fields:

```text
/research-swarm {"query":"Compare approaches A and B","depth":"deep","maxWorkers":6,"verification":"risk-based","freshness":"sources published since 2024","outputRoot":"artifacts/research-runs"}
```

| Field | Values | Default |
| --- | --- | --- |
| `query` | non-empty string | required |
| `depth` | `auto`, `light`, `standard`, `deep` | `auto` |
| `maxWorkers` | integer, 1–8 | `8` |
| `verification` | `none`, `risk-based`, `all-material` | `risk-based` |
| `freshness` | non-empty string | none |
| `outputRoot` | non-empty path | `artifacts/research-runs` |

## Modes

* **Auto** lets the planner choose `light`, `standard`, or `deep` from scope and risk.
* **Light** bounds the plan and permits the selected verification policy; use it for narrow, low-consequence questions.
* **Standard** is the normal minimum depth for multi-source questions and uses the selected verification policy.
* **Deep** verifies every normalized claim adversarially, even when the requested policy is `none`.

The workflow always plans, researches isolated subquestions in parallel, normalizes evidence, selects verification targets, adjudicates, synthesizes, semantically reviews, performs at most two targeted report repairs, and uses one persistence writer. It returns the report and archived run directory only.

## Archived run

Each run directory contains:

| File | Purpose |
| --- | --- |
| `manifest.json` | Run ID, creation time, plan ID, archive paths, and record counts. |
| `plan.json` | The interpreted scope, assumptions, depth, subquestions, risks, and verification policy. |
| `sources.jsonl` | Source records with source IDs, provenance, access dates, and independence groups. |
| `claims.jsonl` | Retained claims with claim IDs, evidence locators, confidence, materiality, and counter-evidence. |
| `discarded-claims.jsonl` | Claims excluded from the final ledger, with discard reasons. |
| `verification-events.jsonl` | Append-only adversarial verification attempts and outcomes. |
| `conflicts.json` | Explicit conflicts, their competing claims and sources, reasons, implications, and status. |
| `report.md` | The reader-facing final report. |
| `report-map.json` | The mapping from report units to retained claim IDs and, for inferences, their premise claim IDs. |
| `validation.json` | The machine-readable deterministic structural-validation result. |

`src_` IDs identify sources; `clm_` IDs identify claims; `ver_` IDs identify verification events; and `conf_` IDs identify evidence conflicts. An `independence_group` identifies a shared underlying origin, so derivative coverage is not mistaken for independent confirmation. `report-map.json` makes each key report unit auditable against its claims.

Generated run directories are ignored by Git; the archive root is retained with `.gitkeep`.

## Validation

Run the offline checks from the repository root:

```text
node --test tests/research-validation.test.mjs
node scripts/validate-research-run.mjs tests/fixtures/valid-run
node scripts/validate-research-run.mjs tests/fixtures/invalid-missing-source
node scripts/validate-research-run.mjs tests/fixtures/invalid-unknown-claim
node scripts/validate-research-run.mjs tests/fixtures/invalid-confidence
```

The first two commands pass. Each invalid fixture must emit `valid: false` and exit nonzero.

## Limitations

Source availability does not establish truth, and verification reduces rather than eliminates error. Inaccessible or rate-limited sources can remain `unverifiable`; repeated coverage from one study, filing, press release, interview, or dataset is not independent confirmation. Use qualified legal, medical, financial, safety, or other high-stakes review before relying on a report for consequential decisions.
