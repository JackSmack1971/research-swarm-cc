# Repository Instructions

## Project purpose

This repository contains a customized Deep Research Swarm built for Claude Code.

Codex is the implementation tool only. The finished research system must run entirely inside Claude Code.

Do not create an OpenAI agent runtime, OpenAI API integration, Codex workflow, external orchestration service, or standalone research application.

## Authoritative project documents

Before making changes, read:

1. `docs/research-swarm-spec.md`
2. `docs/research-swarm-progress.md`
3. the current goal prompt
4. relevant existing repository files

If the specification does not exist yet, only the bootstrap milestone may create it.

The specification defines the architecture and contracts. The progress document records implementation state, decisions, validation results, and remaining work.

Do not silently change an architectural requirement. Record necessary deviations in the progress document with:

* the original requirement;
* the reason it cannot be followed;
* the chosen alternative;
* the files affected;
* the evidence supporting the decision.

## Runtime boundary

The target runtime is Claude Code.

Allowed implementation surfaces include:

* `.claude/workflows/`
* `.claude/agents/`
* `.claude/skills/`
* `.claude/rules/`
* `.claude/settings.json`
* Node.js validation scripts
* tests, fixtures, templates, schemas, and documentation

Do not add:

* OpenAI SDK dependencies;
* Anthropic SDK dependencies unless an official Claude Code workflow explicitly requires them;
* LangChain;
* CrewAI;
* AutoGen;
* a database;
* a web server;
* a background daemon;
* GitHub Issues as the active blackboard;
* an external orchestration framework.

Use Node.js built-in modules only unless the existing repository already contains an approved dependency that directly fits the requirement.

## Milestone protocol

Work only on the milestone named in the current goal.

For every milestone:

1. inspect the repository before editing;
2. read the authoritative documents;
3. identify existing files that must be merged rather than replaced;
4. implement only the current milestone;
5. run the milestone’s validation commands;
6. inspect the resulting diff;
7. update `docs/research-swarm-progress.md`;
8. stop without beginning the next milestone.

Do not preemptively create files assigned to later milestones unless required to make the current milestone testable. Record any such exception.

Do not rewrite unrelated files.

Do not commit, push, open a pull request, or modify application source code unless explicitly requested.

## Documentation verification

Claude Code features can change.

When an implementation depends on a Claude Code API, workflow primitive, frontmatter field, settings key, tool name, or file location:

* consult locally installed Claude Code help or official Claude Code documentation when available;
* do not invent an option name;
* do not copy an undocumented example blindly;
* record the verified interface and source in the progress document.

Prefer a smaller working implementation over speculative configuration.

## Research-swarm architecture

The intended control flow is:

1. plan and classify depth;
2. research independent subquestions in parallel;
3. normalize sources and claims;
4. select verification targets by risk;
5. verify selected claims adversarially;
6. adjudicate conflicts;
7. synthesize from retained claims only;
8. validate report support;
9. perform at most two targeted repair rounds;
10. persist one auditable run.

The JavaScript workflow owns orchestration.

Custom agents own role instructions.

Skills hold reusable research standards.

Deterministic Node.js scripts enforce structural integrity.

Prompt text alone must not be described as hard enforcement.

## Shared-state rule

Research workers and verifiers must not concurrently edit shared artifact files.

Intermediate results should remain in workflow variables.

Only the persistence writer may create the final archived run.

The persistence writer may repair serialization or formatting defects but may not change evidence, claims, confidence, verification outcomes, conflicts, or conclusions.

## Evidence invariants

Every retained externally verifiable material claim must:

* have a unique claim ID;
* reference at least one known source ID;
* include an evidence locator;
* include confidence and its rationale;
* include materiality;
* preserve material counter-evidence;
* map to any final report unit that relies on it.

Multiple sources derived from the same origin are not independent confirmation.

Unavailable evidence is `unverifiable`, not `contradicted`.

A synthesizer may make an inference only when it labels the inference and identifies its premise claim IDs.

## Engineering requirements

* Preserve existing formatting and repository conventions.
* Prefer small, reviewable files.
* Add comments only where behavior is not obvious.
* Use `node:test`.
* Make validation failures actionable.
* Use nonzero exit codes for failed deterministic validation.
* Avoid placeholder URLs, TODOs, pseudocode, and unfinished required files.
* Keep fixtures deterministic and offline.
* Never include secrets or generated live research results.

## Definition of done

A milestone is complete only when:

* every requested file exists;
* the implementation matches the current specification;
* required checks pass;
* the diff contains no unrelated changes;
* no placeholders remain in milestone files;
* the progress document records what changed and what was verified.

Do not claim Claude Code runtime testing occurred unless the workflow was actually executed in Claude Code.

## Required milestone response

End every milestone response with:

### Completed

Files created and updated.

### Validation

Exact commands run and their outcomes.

### Decisions

Important implementation choices or deviations.

### Remaining

Work intentionally left for later milestones.

### Stop point

Confirm that no later milestone was started.
### RULE: CONTINUOUS CHANGELOG PROTOCOL
**TRIGGER:** You must execute this step as the final action of any task that alters user-facing behavior, BEFORE you inform the user the task is complete.
**ACTION:** Read `CHANGELOG.md`. Append a plain-language, single-line summary of the change to the `## [Unreleased]` section.
**FILTER:** Record only items categorized as Added, Changed, Deprecated, Removed, Fixed, or Security. Ignore pure internal refactoring, CI tweaks, and test coverage.
**FORMAT:** Strictly adhere to the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format. Write for a non-technical end-user.
