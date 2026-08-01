---
name: run-research-swarm-cc
description: Build, run, and drive research-swarm-cc. Use when asked to run its tests, smoke-test the research-learning CLI scripts, validate a research run archive, check contract generation, or verify a change to the research-swarm workflow/skill system before committing.
---

This repo has no standalone runtime — `AGENTS.md` explicitly forbids a web server, daemon, or external orchestrator. The product is a set of Node CLI scripts under `scripts/` plus Claude Code workflow/command/skill files that shell out to them. Drive it via `.claude/skills/run-research-swarm-cc/driver.mjs`, which exercises those scripts directly against real fixtures, isolated from your real project state.

All paths below are relative to the repo root.

## Prerequisites

Node.js (works with v22.20.0; no OS packages needed — pure `node:*` built-ins plus the one `ajv` dependency already in `package.json`).

## Setup

```bash
npm install
```

## Run (agent path)

```bash
node .claude/skills/run-research-swarm-cc/driver.mjs all
```

This runs five groups (12 checks) covering every scripts/*.mjs entry point that recent commits touch, and prints `PASS`/`FAIL` per check plus a final `ALL PASS` / `N STEP(S) FAILED` line (exit 0/1 accordingly):

| step | what it does |
|---|---|
| `contracts` | `node scripts/generate-research-contracts.mjs --check` — verifies generated JSON-schema contracts are in sync |
| `validate` | `node scripts/validate-research-run.mjs <dir>` against `tests/fixtures/valid-run` (expect valid) and `tests/fixtures/invalid-confidence` (expect exit 1 with schema errors) |
| `hook` | `node scripts/hook-smoke-test.mjs tests/fixtures/research-learning-hook/stop.json` (drives the real `Stop` hook, `scripts/recover-research-learning.mjs`, as a subprocess) and `node scripts/doctor-research-learning-hooks.mjs .claude/settings.json` |
| `learning` | Full lifecycle against `scripts/research-learning-control.mjs`: `status` → `rebuild` → register a real lesson via `scripts/register-research-learning.mjs tests/fixtures/valid-run-v2` → `scripts/advance-research-learning.mjs` → `pause` → `resume` |
| `replay` | `node scripts/replay-research-policy.mjs tests/fixtures/replay-policy/post-retrieval-candidate.json` |

Run a single step instead of all of them:

```bash
node .claude/skills/run-research-swarm-cc/driver.mjs validate
```

Valid step names: `contracts`, `validate`, `hook`, `learning`, `replay`, `all` (default).

**Isolation:** the `learning` step sets `RESEARCH_LEARNING_ROOT` to a fresh temp directory (via `mkdtemp`) for every `research-learning-control.mjs` / `register-research-learning.mjs` / `advance-research-learning.mjs` call, and deletes it when the driver exits — it never touches your real `artifacts/research-learning/` (which is gitignored anyway). Safe to re-run any number of times.

### Direct invocation (no driver)

Every step above is just a thin wrapper around a real CLI script. To poke one directly:

```bash
node scripts/research-learning-control.mjs status
node scripts/validate-research-run.mjs artifacts/research-runs/<some-run-dir>
node scripts/compile-research-policy.mjs "<query text>"
```

`research-learning-control.mjs` actions: `status`, `explain <lesson-id>`, `pause`, `resume`, `rollback <snapshot-id>`, `rebuild`.

### The flagship workflow (not covered by the driver)

`/research-swarm <query>` and the `research-evolve`/`research-feedback`/`research-learning-*` slash commands (`.claude/commands/*.md`) are the actual product surface, but they only run inside a live Claude Code session — `/research-swarm` spawns several real subagents that do real web research (see `.claude/workflows/research-swarm.js`, loaded by Claude Code's own Workflow tool, not run via plain `node`). That's real time and tool cost, so this driver deliberately doesn't invoke it. To verify a workflow change end-to-end, actually run `/research-swarm` with a small query (e.g. `depth=light`) in a Claude Code session and inspect the resulting `artifacts/research-runs/<run-id>/` with the `validate` step above.

## Test

```bash
npm test
```

88 tests via `node --test tests/*.test.mjs`, all passing as of this writing.

---

## Gotchas

- **`advance-research-learning.mjs` does not promote a lesson to `active` from a single registered run.** Registering `tests/fixtures/valid-run-v2` (which has 1 lesson) and then advancing leaves `active_lessons: 0` — promotion needs stronger accumulated evidence (multiple supporting runs / independence groups), so a single-fixture smoke test can't exercise the `active` state. Don't read a `0` here as a bug.
- **`research-learning-control.mjs status` on a brand-new `RESEARCH_LEARNING_ROOT` reports `"health":"empty_or_recoverable"`, not an error.** That's the expected fresh-state response, not a failure — the CLI treats "nothing here yet" as recoverable-by-`rebuild`, not broken.
- **`artifacts/research-learning/` is gitignored** (`.gitignore`) — running the learning scripts against the real project root (instead of a sandboxed `RESEARCH_LEARNING_ROOT`) silently writes real generated state (`generated-policy.json`, snapshots) that never shows up in `git status`. The driver avoids this entirely by sandboxing; if you invoke the scripts directly against the real root for manual testing, remember to `rm -rf artifacts/research-learning` afterward if you don't want to keep the generated state.
- **`validate-research-run.mjs` exit code doubles as the pass/fail signal**: `0` for valid, `1` for schema/structural errors, `2` for CLI usage errors (missing argument). The JSON body on stdout has the same info either way — check `.valid`, don't just parse-and-hope.
