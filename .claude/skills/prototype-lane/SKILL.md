---
name: prototype-lane
description: Run a bounded, disposable experiment for a draft Change Contract uncertainty without implementing production work.
disable-model-invocation: true
---

# Disposable prototype lane

Use this manual procedure only after the Decision Router selects `prototype` for an experiential, UX, state, or architecture question that repository inspection cannot settle.

1. Read `AGENTS.md`, the active Change Contract, `docs/engineering-constitution.md`, and the linked uncertainty. Keep the contract `draft` while that execution-relevant question is unresolved.
2. Create a `prototype-experiment.schema.json` record with its question/uncertainty link, hypothesis and variants, exact profiled base revision/fingerprint, an absolute location outside the production repository, bounded local run instructions, and `cleanup.state: planned`.
3. Create the isolated checkout with `node scripts/prototype-worktree.mjs create <experiment.json> <repository-root>`. Work only there. Record observations and an `accepted`, `rejected`, or `inconclusive` verdict.
4. Treat the record as evidence only. A human/system decision must separately reference its result before requirements can use it. Never copy or promote prototype artifacts directly; later authorized production work starts from the decision, not the worktree.
5. Dispose the checkout with `node scripts/prototype-worktree.mjs cleanup <experiment.json> <repository-root>`. The helper refuses source drift and leaves a dirty worktree for manual inspection rather than deleting it.

This skill must not implement production code, execute production changes, or authorize a task. It must not commit or push, merge, or deploy. It is a focused procedure, not a prototype swarm.

If a Claude Code custom subagent is justified for the experiment, configure documented `isolation: worktree` as well; it does not replace the recorded base revision, local worktree checks, or disposal step.
