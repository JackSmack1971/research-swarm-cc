# Research Swarm Progress

## Repository inventory

Milestone 1 inspection found a documentation-only workspace:

* `AGENTS.md`
* `docs/research-swarm-spec.md`
* `docs/research-swarm-progress.md`

At that time, no `CLAUDE.md`, `.claude/` configuration, package manifest, lockfile, test setup, scripts, application source, ignore file, fixtures, or schemas existed. The current workspace has Git metadata and an `origin` remote; the initial `gh` pre-scan's `--sort` incompatibility remains a CLI limitation.

## Detected project conventions

* Markdown is the only established repository format.
* `AGENTS.md` is authoritative for the runtime boundary, milestone protocol, evidence invariants, and deterministic Node.js validation requirements.
* Future implementation uses approved Claude Code surfaces and Node.js built-ins, except Ajv 8, which Milestone 12 approves solely for JSON Schema contract enforcement.
* Milestone 1 remains documentation-only.

## Milestones

| Milestone | Scope | Status |
| --- | --- | --- |
| 1 | Bootstrap specification and progress tracking | complete |
| 2 | Define canonical research contracts and report template | complete |
| 3 | Establish Claude Code research rules and shared standards skill | complete |
| 4 | Define custom research agents | complete |
| 5 | Define adjudication, semantic-validation, synthesis, and persistence roles | complete |
| 6 | Implement deterministic research-run validation | complete |
| 7 | Add offline research-run fixtures and deterministic `node:test` coverage | complete |
| 8 | Claude Code dynamic-workflow foundation through normalization | complete |
| 9 | Complete dynamic workflow through verification, repair, and persistence | complete |
| 10 | Repository integration and documentation | complete |
| 11 | Integrate documentation, static checks, and acceptance review | incomplete — documented Dynamic Workflow API cannot hard-enforce role-specific archive writes |
| 12 | Authorize and plan `audit-run-1` remediation | complete |
| 13 | Canonical-contract enforcement and generated workflow schemas | complete |
| 14 | Integrate verifier-discovered sources and evidence into the canonical ledger | authorized |
| 15 | Enforce canonical JSON Schema contracts and anchor report maps to report text | authorized |
| 16 | Harden behavioral isolation, untrusted-content handling, output paths, and resource limits | authorized |
| 17 | Merge verification policy and activate post-normalization depth escalation | authorized |
| 18 | Add bounded targeted ledger, verification, and report repairs | authorized |
| 19 | Preserve safe, stage-specific failure diagnostics | authorized |
| 20 | Verify migrations, backward compatibility, and final Claude Code smoke behavior | authorized |

## Decisions log

| Date | Decision | Evidence |
| --- | --- | --- |
| 2026-07-28 | Claude Code is the sole target runtime; the JavaScript workflow owns orchestration and roles remain custom agents. | `AGENTS.md` runtime and architecture sections; specification §§2–3. |
| 2026-07-28 | Keep Milestone 1 documentation-only; do not create future workflow, agent, skill, schema, validator, fixture, artifact, or settings files. | Current goal; `AGENTS.md` milestone protocol. |
| 2026-07-28 | Use the documented native workflow surface: `.claude/workflows/`, `export const meta`, top-level `await`, `agent()`, `pipeline()`, and structured `schema` results. | Official workflows documentation; installed Claude Code is 2.1.220. |
| 2026-07-28 | Set `workflowSizeGuideline` to `medium` when settings are created. The value is advisory, not a concurrency cap. | Current official workflows documentation: the setting is available from Claude Code 2.1.219. |
| 2026-07-28 | Keep only direct workflow-to-named-project-agent routing and local workflow enablement as gates. Until routing is documented, inline each role contract in its workflow `agent()` prompt while retaining reusable `.claude/agents/*.md` role definitions. | Official workflows documentation and specification §11.4. |
| 2026-07-28 | Implement the current goal's Milestone 2 as canonical contracts, superseding the earlier progress-table ordering. No workflow, agent, skill, validator, fixture, or runtime integration was added. | Current goal prompt; `AGENTS.md` milestone protocol; specification §§3.4 and 12–13. |
| 2026-07-28 | Use Draft 2020-12 JSON Schema with relative file `$ref` references and stable typed IDs. Publication dates may be `null` only with a non-empty unavailability reason. | `research/schemas/*.schema.json`; `AGENTS.md` evidence invariants; current goal requirements. |
| 2026-07-28 | Use only the documented non-user-facing skill frontmatter: `name`, `description`, and `user-invocable: false`. Keep the rule and skill as standards documents; no agents, validators, fixtures, or workflow code belong to this milestone. | Official [Claude Code skills documentation](https://code.claude.com/docs/en/slash-commands), Context7 review, current goal, `.claude/rules/deep-research.md`, and `.claude/skills/research-standards/SKILL.md`. |
| 2026-07-28 | Define the planner, worker, normalizer, and verifier as project subagents with only documented `name`, `description`, `tools`, `model`, and `skills` frontmatter. Each uses `model: inherit`, preloads `research-standards`, excludes `Agent`, and has an explicit allowlist; the worker and verifier allow only read-only repository and web-research tools. | Installed Claude Code `2.1.220` help; official [Create custom subagents](https://code.claude.com/docs/en/sub-agents) and [Tools reference](https://code.claude.com/docs/en/tools-reference); `.claude/agents/research-*.md`. |
| 2026-07-28 | Define the adjudicator, semantic validator, and synthesizer as read-only project subagents; grant `Write` and `Bash` only to the persistence writer, which is the sole role allowed to create archived runs and has no web tools. | Current Milestone 5 goal; installed Claude Code `2.1.220` help; `.claude/agents/research-adjudicator.md`, `research-semantic-validator.md`, `research-synthesizer.md`, and `research-persistence-writer.md`. |
| 2026-07-28 | Treat the current goal's deterministic-validation scope as Milestone 6, despite the prior progress-table wording. The validator uses only Node.js built-in modules, requires the canonical archive layout, and checks structural support rather than natural-language truth. | Current goal; specification §§8 and 13; `scripts/lib/jsonl.mjs`, `scripts/lib/research-validation.mjs`, `scripts/validate-research-run.mjs`. |
| 2026-07-28 | Treat the current goal's offline-fixture and deterministic-test scope as Milestone 7, despite the prior progress-table wording. Keep the three named invalid fixtures readable and use temporary copies of the valid archive for the remaining focused mutations. | Current goal; `tests/research-validation.test.mjs`; `tests/fixtures/`. |
| 2026-07-28 | Treat the current goal's Milestone 8 as the dynamic-workflow foundation, superseding the earlier persistence wording. The workflow stops after plan, isolated parallel research, normalization, and deterministic verification-target selection; verification execution and every later stage remain unimplemented. | Current goal; `AGENTS.md` milestone protocol; `.claude/workflows/research-swarm.js`. |
| 2026-07-28 | Treat the current goal's Milestone 9 as completion of the dynamic workflow, superseding the stale Milestone 9 table wording. The workflow now performs selected parallel verification, explicit Deep fallback selection, adjudication, synthesis, semantic review, at most two targeted report-repair rounds, and one persistence-writer call that runs the deterministic validator. | Current goal; `AGENTS.md` architecture and shared-state rules; `.claude/workflows/research-swarm.js`. |
| 2026-07-29 | Treat the current goal's Milestone 10 as repository integration and documentation, superseding the stale table wording. Add only the documented `workflowSizeGuideline` setting; document that Dynamic workflows is enabled through `/config`, not an unverified settings key. Do not create `CLAUDE.md` because it does not exist and no repository convention requires it. | Current goal; current Claude Code documentation via Context7; local `claude --version`; `.claude/settings.json`; `research/README.md`. |
| 2026-07-29 | Milestone 11 tightened the workflow's inline output contracts for source provenance, canonical conflicts, and discarded claims; it also honors `verification: "none"` outside Deep and returns only `report` and `run_directory`. | `.claude/workflows/research-swarm.js`; offline syntax and test checks. |
| 2026-07-29 | Milestone 11 added canonical ID patterns to every workflow record contract and to deterministic archive validation after a live smoke run exposed noncanonical IDs passing the earlier validator. | `.claude/workflows/research-swarm.js`; `scripts/lib/research-validation.mjs`; `tests/research-validation.test.mjs`. |
| 2026-07-29 | Do not mark the project complete. Current Dynamic Workflow documentation supports `agent()` and `pipeline()` but does not document selecting a named project agent or a per-call tool restriction. Workflow subagents run in `acceptEdits` mode, so the worker/verifier and archive-only writer guarantees are prompt contracts rather than hard enforcement. | Official Dynamic Workflows and subagent documentation; `.claude/workflows/research-swarm.js`; `.claude/agents/research-*.md`. |
| 2026-07-29 | Authorize Milestones 12–20 from audit-run-1. Keep native Claude Code dynamic workflows; describe role write isolation as behavioral until named-agent routing or per-call tool restrictions are documented. | Remote `main` `docs/audit-run-1.md`; current workflow documentation and existing risk log. |
| 2026-07-29 | Approve Ajv 8 as the only new dependency, exclusively to enforce canonical JSON Schemas. Canonical schemas become the contract source and generated workflow inline schemas must be drift-checked. | `docs/audit-run-1-remediation-plan.md`; audit finding “workflow schemas and canonical schemas have already drifted.” |
| 2026-07-29 | Preserve existing fixtures and archived-run compatibility whenever possible; any contract-breaking change requires a documented, tested migration before Milestone 20 can pass. | `docs/audit-run-1-remediation-plan.md`; audit requirements for complete history and canonical contract enforcement. |
| 2026-07-29 | The current Milestone 13 goal explicitly assigns canonical-contract enforcement ahead of the prior remediation-table sequence. The earlier table assigned that work to Milestone 15; the current goal supersedes it. Ajv 8 validates every archived canonical record before cross-record checks, and canonical schemas generate the workflow block and validator registry. | `package.json`, `scripts/generate-research-contracts.mjs`, `scripts/lib/research-contracts.generated.mjs`, `scripts/lib/research-validation.mjs`, `.claude/workflows/research-swarm.js`; `npm ci`, contract generation/check, fixture validation, and 18 offline tests. |

## Claude Code interface findings

Verified against installed Claude Code `2.1.220`, its `claude --help`, Context7's Claude Code documentation, and official Claude Code docs on 2026-07-28:

* Project custom agents are Markdown files in `.claude/agents/`; documented frontmatter includes required `name` and `description`, with optional `tools`, `disallowedTools`, `model`, and `skills`. `model: inherit` is supported.
* Project skills use `.claude/skills/<skill-name>/SKILL.md`. Skills can be preloaded into an agent through its `skills` frontmatter field.
* Dynamic workflows require Claude Code 2.1.154 or later. Version 2.1.220 supports project workflows in `.claude/workflows/`, `export const meta`, top-level `await`, `agent()`, `pipeline()`, structured results through `schema`, and slash-command invocation of saved workflows.
* `workflowSizeGuideline` is supported in settings files from Claude Code 2.1.219. In 2.1.220, `medium` is advisory and does not override runtime agent caps.
* The workflows documentation does not document an `agent()` option that selects a named project agent definition. This remains the only workflow API gate. Local availability also remains unproven until `/config` confirms Dynamic workflows is enabled and a workflow is run in this installation.
* The official workflow documentation verifies a project workflow's no-import script shape: `export const meta = { name, description }`, top-level `await`, `agent(prompt, { label, schema })`, `pipeline(items, mapper)` for parallel per-item agents, and a script-level return value. Structured `schema` values are inline JSON Schema objects. No documented `agent()` option routes directly to a named `.claude/agents/` file.

Sources: [Dynamic workflows](https://code.claude.com/docs/en/workflows), [Create custom subagents](https://code.claude.com/docs/en/sub-agents), [Extend Claude with skills](https://code.claude.com/docs/en/slash-commands), [Explore the `.claude` directory](https://code.claude.com/docs/en/claude-directory), and local `claude --help`.

## Validation log

| Date | Command or check | Result |
| --- | --- | --- |
| 2026-07-28 | `Get-ChildItem -Force`; `rg --files` | Confirmed the three-file documentation-only inventory. |
| 2026-07-28 | `Get-ChildItem -Force -Recurse -Filter CLAUDE.md` | No `CLAUDE.md` exists. |
| 2026-07-28 | `git status --short` | Expected failure: no `.git` directory. |
| 2026-07-28 | `claude --version`; `claude --help` | Installed CLI reports `2.1.220`; help inspected. |
| 2026-07-28 | Official documentation and Context7 review | Verified agent, skill, settings, and dynamic-workflow interfaces; documented the direct named-agent-routing gap. |
| 2026-07-28 | Documentation cross-check | Specification covers runtime, roles, contracts, depths, verification, repair limit, one-writer persistence, deterministic validation, archive layout, and acceptance criteria. |
| 2026-07-28 | Milestone scope assertion (PowerShell with `Select-String`, `Get-ChildItem`, and `rg`) | Passed: verified documented workflow interfaces and remaining routing gate; Milestone 1 complete, Milestone 2 next; no later-milestone implementation files or TODO/TBD markers. |
| 2026-07-28 | `node -e "...JSON.parse(...)"` over `research/schemas/*.json` | Passed: all eight Milestone 2 schemas parse as JSON. |
| 2026-07-28 | Offline Node.js cross-reference inspection of each schema `$ref` | Passed: all relative schema references and JSON-pointer targets resolve; materiality and verification-outcome enums match the canonical contracts. |
| 2026-07-28 | `rg -n -i 'TODO|TBD|placeholder' research docs/research-swarm-progress.md` | Passed: no prohibited completion markers in Milestone 2 files. |
| 2026-07-28 | Node.js frontmatter parse and schema-terminology cross-check | Passed: `research-standards` frontmatter has the documented fields and values; confidence and materiality terms match `claim.schema.json`; required rule and skill invariants are present. |
| 2026-07-28 | Claude Code CLI and official subagent/tool documentation inspection | Passed: CLI is `2.1.220`; project agents use Markdown/YAML, `model: inherit`, `skills`, and `tools` are documented; `Read`, `Glob`, `Grep`, `WebSearch`, and `WebFetch` are exact built-in tool names. |
| 2026-07-28 | Offline Node.js agent-definition check | Passed: each Milestone 4 file has required documented frontmatter, preloads `research-standards`, does not grant `Write`, `Edit`, or `Agent`, and the worker/verifier retain documented web-research tools with explicit no-write and no-spawn instructions. |
| 2026-07-28 | Offline Node.js role-contract audit; `rg -n -i 'TODO|TBD|placeholder'` over the four Milestone 5 agent files; `git diff --check` | Passed: all eight agent definitions have documented frontmatter and preload `research-standards`; the four new roles map to existing contracts, prohibit spawning, and grant archive-writing authority only to the persistence writer. No prohibited completion markers or whitespace errors. |
| 2026-07-28 | `node --check scripts/lib/jsonl.mjs`; `node --check scripts/lib/research-validation.mjs`; `node --check scripts/validate-research-run.mjs` | Passed: the JSONL helper, structural validator, and CLI parse. |
| 2026-07-28 | Temporary offline Node.js run exercising `validateResearchRun()` | Passed: a valid minimal run passes; malformed JSONL and a missing run directory fail predictably. No fixture files were retained because fixtures are assigned to a later milestone. |
| 2026-07-28 | `node scripts/validate-research-run.mjs` | Passed expected failure behavior: emits JSON usage error and exits `2`. |
| 2026-07-28 | `node --test tests/research-validation.test.mjs` | Passed: 12 deterministic offline checks cover valid archives, source and report-map references, high-confidence criteria, duplicate IDs, malformed JSONL, verification outcome distinction, unresolved material conflicts, retained/discarded overlap, inference premises, and manifest counts. |
| 2026-07-28 | `node scripts/validate-research-run.mjs tests/fixtures/valid-run` | Passed: emitted `valid: true` and exited `0`. |
| 2026-07-28 | `node scripts/validate-research-run.mjs tests/fixtures/invalid-unknown-claim`; `node scripts/validate-research-run.mjs tests/fixtures/invalid-confidence` | Passed expected failure behavior: both representative invalid fixtures exited `1`. |
| 2026-07-28 | Static workflow contract check and transformed module syntax check for `.claude/workflows/research-swarm.js` | Passed: metadata, inline schemas, argument parser, capped consolidation, `pipeline()` workers, normalization, and pure deterministic verification selection are present; no later-stage roles or direct filesystem/shell access are present. The transform removes only Claude Code's documented script-level `return`, which standard Node module parsing does not permit. |
| 2026-07-28 | Wrapped-module syntax check for `.claude/workflows/research-swarm.js` | Passed: the full workflow parses when wrapped in the documented async workflow execution context. |
| 2026-07-28 | `node --test tests/research-validation.test.mjs`; `node scripts/validate-research-run.mjs tests/fixtures/valid-run` | Passed: all 12 offline deterministic tests passed and the valid archived fixture emitted `valid: true`. |
| 2026-07-28 | `node scripts/validate-research-run.mjs tests/fixtures/invalid-missing-source` | Passed expected failure behavior: emitted `valid: false` and exited nonzero. |
| 2026-07-29 | Context7 current Claude Code documentation review; `claude --version`; `claude --help` | Confirmed dynamic workflows require 2.1.154+, `workflowSizeGuideline` is a documented settings key from 2.1.219+ with `medium` as an allowed advisory value, and enabling Dynamic workflows is handled through `/config` where available. Local CLI is 2.1.220. |
| 2026-07-29 | JSON/settings parse, `claude doctor`, Node syntax checks, `node --test tests/research-validation.test.mjs`, valid and invalid fixture validation, archive-ignore and README cross-reference checks, and `git diff --check` | Passed: settings JSON parses; Claude Code installation is healthy; 12 deterministic tests pass; the valid fixture validates; all three invalid fixtures fail with exit code 1; generated archives are ignored while `.gitkeep` remains; documentation names the implemented files and command. Claude Code workflow execution was not performed. |
| 2026-07-29 | Full Milestone 11 fixture parse, workflow wrapper syntax check, deterministic validation, static scan, and documentation/API audit | Passed: all 29 JSON and 16 JSONL files parse; workflow parses in the documented async execution shape; 12 Node tests pass; valid fixture passes; named invalid fixtures fail for `claim.evidence.source`, `report_map.claim`, and `claim.confidence.high`; no prohibited markers or whitespace errors. Official documentation confirms the saved-workflow `args`, `agent()`, `pipeline()`, `schema`, agent frontmatter, skills preloading, and `workflowSizeGuideline` interfaces. |
| 2026-07-29 | Claude Code Light-mode smoke test: `claude --print --output-format json '/research-swarm {"query":"What is the capital of France?","depth":"light","maxWorkers":1,"verification":"none"}'` | The print client timed out after 124 seconds, but the launched background workflow completed. Its persisted trace shows one worker, one verifier, two bounded semantic-repair rounds, and only the persistence writer created archive files. The archive passed the then-current validator. A follow-up audit found that its noncanonical IDs were accepted, so the validator and output schemas were repaired; the generated live archive was removed and the added regression test passes. |
| 2026-07-29 | Milestone 12 audit-plan cross-check | Passed: restored the missing audit verbatim from remote `main`; every audit heading and recommendation maps once to Milestones 13–20 with acceptance and regression evidence in `docs/audit-run-1-remediation-plan.md`. No workflow, schema, agent, validator, fixture, or runtime code changed. |
| 2026-07-29 | Context7 Ajv 8 review; remediation mapping assertion; `node --test tests/research-validation.test.mjs`; `node scripts/validate-research-run.mjs tests/fixtures/valid-run`; `git diff --check` | Passed: Context7 documents Ajv's `Ajv2020` entry point for Draft 2020-12; all audit headings and Milestones 13–20 are present in the matrix; 13 deterministic tests pass; the valid fixture validates; and the documentation diff has no whitespace errors. |
| 2026-07-29 | `npm ci`; `npm run contracts:generate`; `npm run contracts:check`; `npm test`; `node scripts/validate-research-run.mjs tests/fixtures/valid-run`; `node scripts/validate-research-run.mjs tests/fixtures/invalid-missing-source` | Passed: Ajv 8 is the only dependency; generated workflow and registry are current; 18 deterministic tests cover canonical object-shape, formats, conditionals, stale generation, missing references, and duplicate schema IDs; valid fixture passes and the representative invalid fixture exits 1. |

## Known risks

* Dynamic workflows executed successfully in this installation, but the noninteractive print client did not return the workflow's final value before timing out. The persisted run trace, report, and archive were inspected directly instead.
* Direct workflow routing to a named `.claude/agents/` definition is not documented. The inline workflow role prompts therefore cannot inherit the custom agents' restrictive tool allowlists. Current workflow documentation also states that workflow subagents run in `acceptEdits` mode. This blocks proof that workers/verifiers cannot write shared artifacts and that the persistence writer alone is technically capable of archived writes.
* The semantic validator is a structured model-review gate. The deterministic validator proves report-map references and support coverage but cannot parse arbitrary report prose; semantic support remains model-evaluated rather than fully deterministic.
* The GitHub CLI in this environment does not support the requested `gh issue list --sort` flag; the compatible pre-work scan omits that sort option.
* The smoke trace showed compliant behavior for that one run, but it cannot establish a universal write restriction because current workflow `agent()` calls still lack documented named-agent routing or per-call tool restrictions.
* Existing inline workflow schemas, canonical schemas, validator checks, and agent prose can drift until Milestone 15 makes canonical JSON Schemas the generated contract source.
* Existing archived runs and fixtures predate the Milestones 13–19 archive contract changes. Each contract change must remain compatible or carry an explicit, tested migration; Milestone 20 is the compatibility gate.
* Verifier-discovered evidence currently lacks a canonical persistence path; discarded-claim verification history, normalization coverage gaps, semantic-review outcomes, and repair events are not yet complete archive artifacts.
* `outputRoot` is currently caller-controlled, agent fan-out is bounded only indirectly, untrusted source text lacks an explicit prompt-injection rule, planner verification policy is overwritten, escalation triggers are not evaluated, repairs are report-only, and workflow failures omit a safe stage code. These risks remain authorized work, not completed mitigation.

## Next milestone

Milestone 14 — integrate verifier-discovered sources and evidence into the canonical ledger. Milestones 15–20 remain authorized but must not begin until their predecessor is complete. The dynamic-workflow permission limitation remains an explicit behavioral-isolation constraint, not a completion gate.
