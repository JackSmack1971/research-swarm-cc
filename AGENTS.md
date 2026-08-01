# Repository Instructions

## Purpose and runtime

This repository builds a Deep Research Swarm that runs entirely in Claude Code. Codex is an implementation tool only.

Use only the approved Claude Code surfaces (`.claude/workflows/`, agents, skills, rules, settings), Node.js validation scripts, tests, fixtures, templates, schemas, and documentation. Do not add an OpenAI or external agent runtime, an orchestration service, a web server, database, background daemon, or GitHub Issues as the active blackboard. Do not add OpenAI, Anthropic, LangChain, CrewAI, or AutoGen dependencies. Use Node.js built-ins unless an approved existing dependency directly fits; Ajv is solely for canonical JSON Schema enforcement.

## Authority and retrieval

The current goal defines the active milestone and overrides stale historical planning. Before editing, read the current goal, the active/current progress section, relevant specification sections and canonical contracts, and the files being changed. Read the full specification when changing architecture, resolving an ambiguous contract, or when the milestone requires it.

`docs/research-swarm-spec.md` defines research architecture and contracts; `docs/engineering-constitution.md` defines engineering-system boundaries. `docs/research-swarm-progress.md` records state, decisions, and validation. Do not silently deviate from architecture: record the original requirement, reason, alternative, affected files, and evidence in progress.

Detailed research evidence rules live in `.claude/rules/deep-research.md`, `.claude/skills/research-standards/SKILL.md`, and `research/schemas/`; do not duplicate or weaken them here.

## Durable architecture

- The JavaScript workflow owns branching, fan-out, selection, retry/repair limits, aggregation, and final return values; custom agents own role instructions.
- Canonical JSON Schemas and deterministic Node.js validation are enforcement sources. Prompt text is behavioral guidance, not hard enforcement.
- Keep intermediate results in workflow variables. Workers and verifiers must not concurrently edit shared artifacts; only the persistence writer creates a final archived run and may repair serialization/formatting, never evidence, claims, confidence, verification, conflicts, or conclusions.
- Preserve archive compatibility or explicitly authorize, document, and validate a migration. Describe role write isolation truthfully as behavioral unless Claude Code documents hard named-agent or per-call restrictions.
- When using a Claude Code interface that can change, verify it in locally installed help or current official documentation before relying on it. Official documentation is sufficient for APIs that CLI help does not enumerate, provided the installed version meets the documented compatibility requirement and no local evidence contradicts it; record the interface and source in progress. Never claim runtime validation unless it ran in Claude Code.

## Milestone discipline

Work only on the active milestone. Inspect before editing; merge existing files rather than replacing unrelated content; run the milestone checks; inspect the diff; update progress; then stop without starting the next milestone. Do not preemptively create later-milestone files unless needed to test the active one, and record the exception.

Preserve repository conventions. Keep files small and reviewable, fixtures deterministic and offline, failures actionable with nonzero exits, and required files free of placeholders, TODOs, pseudocode, secrets, and live research output. Use `node:test` for new tests. Do not make unrelated edits, commits, pushes, or pull requests unless explicitly requested.

## Completion and changelog

Before reporting a functional change complete, run relevant validation and `git diff --check`, record results in progress, and show the required completion sections: Completed, Validation, Decisions, Remaining, and Stop point. Also include this table:

| Requirement | Status (DONE / MISSING / N/A) |
|:--|:--|
| Code execution verified | [Status] |
| CHANGELOG.md updated | [Status] |

For user-facing Added, Changed, Deprecated, Removed, Fixed, or Security changes, as the final task action before reporting completion, read `CHANGELOG.md` and append one plain-language line under `## [Unreleased]` in the appropriate Keep a Changelog category. Do not add changelog entries for internal refactors, CI, or test-only changes.
