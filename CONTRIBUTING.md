# Contributing to Research Swarm for Claude Code

Thank you for helping improve this project. Please read the [Code of Conduct](CODE_OF_CONDUCT.md) before participating. Security vulnerabilities belong in the [security reporting process](SECURITY.md), not public issues or pull requests.

## Before you start

This project targets Claude Code Dynamic Workflows. It deliberately does not add another agent runtime, orchestration service, web server, database, or agent framework. The JavaScript workflow owns control flow; canonical JSON Schemas and deterministic Node.js validation enforce archive contracts.

For substantial changes, open an issue first so the problem, scope, and acceptance criteria can be discussed. Use a focused branch and pull request for one coherent change. Do not include secrets, credentials, private feedback, or live research queries, sources, reports, or generated archives in commits.

There is currently no project license. Until one is added, do not assume a contribution-license grant or package redistribution terms.

## Local setup

You need Node.js with npm and Claude Code 2.1.154 or later if your change uses the workflow. Enable **Dynamic workflows** in Claude Code's `/config` before running it.

```sh
npm ci
npm run contracts:check
npm test
node scripts/validate-research-run.mjs tests/fixtures/valid-run-v2
```

The checks are deterministic and offline. They do not establish that a change ran in Claude Code. Only claim runtime validation when you actually ran it and record the bounded result.

## Making a change

1. Read [AGENTS.md](AGENTS.md), the active section of [the progress record](docs/research-swarm-progress.md), the applicable specification, and the files you will change.
2. Keep the change within the active milestone. Preserve unrelated work already in the tree.
3. Keep the existing boundaries intact:
   - Use Node.js built-ins unless the existing Ajv dependency is directly required for canonical schema enforcement.
   - Treat schemas and deterministic validation as enforcement; prompts are behavioral guidance.
   - Keep intermediate data in workflow variables. Only the persistence writer may create a final archived run.
   - Do not weaken evidence provenance, conflict/gap visibility, repair limits, archive compatibility, or security controls. An archive migration requires explicit authorization and tests against genuine archives.
4. Add or update a small deterministic `node:test` check when non-trivial behavior changes. Keep fixtures offline and failures actionable.
5. Update documentation and the progress record when the architecture, contract, interface assumption, or validation evidence changes. Record any authorized deviation with its reason, alternatives, affected files, and evidence.

## Pull requests

Describe the problem, the intended change, and how you tested it. Call out any contract, archive, security, or runtime-behavior impact. Before requesting review, run the relevant checks above and:

```sh
git diff --check
```

Do not hand-edit generated research archives to make a validator pass. Do not commit files below `artifacts/`. Reviewers may ask for narrower scope, clearer evidence, or tests that cover a changed invariant.

## Reporting non-security problems

Use GitHub issues for reproducible bugs, documentation corrections, and enhancement proposals. Include the expected and actual behavior, a minimal reproduction when safe, relevant command output, and the version or commit you tested. Keep public reports free of vulnerability details and sensitive research data.

## Maintainer decisions

Maintainers review contributions against this guide, the repository contracts, and the Code of Conduct. Acceptance is not guaranteed; maintainers may request revisions or close proposals that do not fit the project's scope or maintenance capacity.
