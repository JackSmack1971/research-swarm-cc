---
description: Prepare evidence-backed research-swarm change proposals for human review.
---

# Research evolve

Use `/research-evolve <proposal JSON>` to create a durable, review-only proposal from active research lessons. The JSON must name at least two strong, independently supported active lesson IDs, include an exact unified patch, repository-relative target files, expected benefit, known risks, replay/canary evidence, required tests, and a reversible rollback plan.

Run `node scripts/create-improvement-candidate.mjs <proposal.json>`. It writes only `artifacts/research-learning/candidates/<candidate-id>/`; it never applies a patch, modifies the working tree, commits, pushes, opens a pull request, or merges.

Then run `node scripts/test-improvement-candidate.mjs <candidate-directory>`. The checker copies the repository to a temporary sandbox, verifies source hashes, applies the proposed patch only there, and runs contract, test, replay, syntax, and diff checks. It marks the manifest `ready`, `rejected`, or `inconclusive`.

Present only `ready` candidates for human review, with their candidate ID, target files, evidence summary, risks, test result, and rollback plan. Reject proposals that touch protected surfaces, broaden tools or permissions, weaken validation, contain live reports/source content/secrets, overlap another pending candidate, or cannot be cleanly reversed.
