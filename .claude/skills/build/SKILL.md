---
name: build
description: Inspect, route, and record engineering decisions without implementing production changes.
disable-model-invocation: true
---

# Engineering decision controller

Use this manual controller to turn a requested engineering change into explicit uncertainty routes and decisions. It is interactive guidance, not permission enforcement.

1. Read `AGENTS.md`, the active goal, `docs/engineering-constitution.md`, current progress, and the files in scope. Inspect repository facts first; use `npm run profile -- <absolute-target-directory>` when its metadata-backed profile is useful.
2. Record each material unknown as an `engineering/schemas/uncertainty.schema.json` record. Validate and route it with `node scripts/route-engineering-uncertainty.mjs <uncertainty.json>`.
3. Follow exactly one route: no inquiry for resolved/reversible details; repository inspection for codebase facts; Research Swarm and a scoped evidence packet only for material external facts; the manual `prototype-lane` procedure for experiential, UX, state, or architecture questions; one highest-value human question for normative, preference, policy, hard-to-reverse, or consequential product choices; and an agent choice only for reversible, low-risk implementation details. Required prototype questions keep a Change Contract draft until a separate explicit decision resolves them.
4. Never ask the human for a fact a trustworthy repository inspection, evidence packet, or prototype can answer. Never treat evidence as a decision or choose a normative value on the human's behalf. When a decision is made, record its rationale, relevant alternatives, evidence references, decider, timestamp, and reversibility using `engineering/schemas/decision.schema.json`.

This skill may inspect, profile, research, route, and record decisions. It must not implement production code, modify product behavior, execute production changes, or approve its own work. It must not commit or push, merge, or deploy. Stop at a decision record and hand the accepted decision to the later change-contract milestone.
