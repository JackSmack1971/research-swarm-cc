---
name: delivery-handoff
description: Validate and present a drift-checked engineering delivery handoff from canonical records.
disable-model-invocation: true
---

# Delivery handoff

Use `/delivery-handoff <delivery-manifest.json> <target-directory>` in a fresh Claude Code session.

1. Read `AGENTS.md`, the current goal, `docs/engineering-constitution.md`, and the manifest first.
2. Run `npm run delivery:handoff -- <delivery-manifest.json> <target-directory>`.
3. Report only the rendered decision/contract, final change identity and files, criterion proofs, unresolved risks or blockers, integration state, and next action.

Stop on any missing reference, digest mismatch, invalid canonical record, or repository drift. Regenerate the affected contract, graph, capsule, authorization, and manifest before proceeding. The handoff is a derived view: it does not replay conversation history, execute or re-execute work, approve criteria, commit, push, merge, or deploy.
