---
name: build
description: Inspect, route, and record engineering decisions without implementing production changes.
disable-model-invocation: true
---

# Engineering decision controller

Use this manual controller to turn a requested engineering change into explicit uncertainty routes and decisions. It is interactive guidance, not permission enforcement.

1. Read `AGENTS.md`, the active goal, the active/current progress section, only the relevant sections of `docs/engineering-constitution.md`, and the scoped files. Inspect repository facts first; use the lazy `repository-intelligence` skill and `npm run profile -- <absolute-target-directory>` when its metadata-backed profile is useful. Do not preload full historical progress, full specifications, archives, delivery records, or repository-wide documentation unless a scoped decision requires them.
2. Record each material unknown as an `engineering/schemas/uncertainty.schema.json` record. Validate and route it with `node scripts/route-engineering-uncertainty.mjs <uncertainty.json>`.
3. Follow exactly one route: no inquiry for resolved/reversible details; repository inspection for codebase facts; T1 for narrow authoritative package facts; the lazy `focused-engineering-research` skill for bounded T2 external facts; the lazy `focused-engineering-verification` skill for bounded T3 cross-checks; `/research-swarm` only for T4 escalation or standalone deep research; the manual `prototype-lane` procedure for experiential, UX, state, or architecture questions; one highest-value human question for normative, preference, policy, hard-to-reverse, or consequential product choices; and an agent choice only for reversible, low-risk implementation details. Required prototype questions keep a Change Contract draft until a separate explicit decision resolves them.
4. Never ask the human for a fact a trustworthy repository inspection, evidence packet, or prototype can answer. Never treat evidence as a decision or choose a normative value on the human's behalf. When a decision is made, record its rationale, relevant alternatives, evidence references, decider, timestamp, and reversibility using `engineering/schemas/decision.schema.json`.

5. Once a Change Contract is accepted and its profiled base remains current, prepare explicit small vertical task drafts and compile them with `npm run tasks:compile -- <contract.json> <task-drafts.json> <absolute-target-directory>`. Resolve task collisions and source drift by regenerating the derived graph/capsules.
6. Before any later implementation, check profile/current state → accepted contract → current task capsule → deterministic risk classification → authorized/not authorized with `npm run authorization:check -- <contract.json> <graph.json> <capsule.json> <absolute-target-directory>`. The record binds contract, capsule, and base snapshots; it rejects drift and unresolved uncertainty, records required controls, and never treats evidence, inferred graph data, or prototype output as authorization.

This skill may inspect, profile, research, route, record decisions, compile task plans, produce an authorization record, and invoke `npm run execute -- <authorization.json> <contract.json> <graph.json> <capsule.json> <absolute-target-directory>` for an authorized isolated task. The command runs a separate fresh-context verifier and may request at most two identified-defect repairs; its returned immutable executor event stays an unverified implementation even when the separate verification record reports success. It must not approve its own work, commit or push, merge, or deploy. Authorization is bounded execution context, not a permission boundary.
