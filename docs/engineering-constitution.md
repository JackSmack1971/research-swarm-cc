# Engineering Constitution

## Purpose and scope

This constitution governs the future engineering system. It does not change the existing research workflow or authorize an executor. The research contracts remain authoritative in [the research specification](research-swarm-spec.md); this document is authoritative for engineering-state boundaries and control decisions.

## Truth planes and typed boundaries

| Plane | Canonical content | May inform | Must not do |
| --- | --- | --- | --- |
| Evidence | Retrieved sources, repository observations, experiments, test/runtime results, and provenance | An explicit decision | Decide what to build by itself |
| Intent | Human/system decisions, rationale, constraints, accepted requirements, and authorization | Acceptance criteria and scoped work | Be inferred automatically from evidence |
| Delivery | Tasks, changes, execution events, verification results, and handoff | Status and future evidence | Rewrite intent or evidence |

The required lineage is `evidence -> decision -> requirement -> acceptance criterion -> task -> verification proof`. Every material edge has stable identifiers and provenance to its predecessor. A decision records the alternatives considered, owner, date, scope, reversibility, and authorization; absence of a decision means evidence remains evidence, not a requirement.

## Ownership and state

Canonical state is the accepted decision/contract, its acceptance criteria, and immutable delivery evidence. The owner of each artifact is named in that artifact; only its owner may change it, and a successor must record the handoff. Repository files and archived research keep their existing owners: research workers and verifiers do not share-write archives; the persistence writer may repair serialization and formatting only.

Profiles, repository maps, LSP/search results, graph edges, task capsules, summaries, and rendered views are derived state. They carry the source revision and generation time, can be deleted and regenerated, and never override canonical state. If the base revision, relevant contract, or evidence changes, derived state is stale and must be refreshed before it authorizes work. An unresolved conflict, missing provenance, failed validation, or stale required input blocks promotion rather than being silently carried forward.

## Rigor, autonomy, and control

| Level | Use when | Minimum durable record |
| --- | --- | --- |
| Quick | Small, reversible, single-session work | Decision note, scope, observed check |
| Standard | Normal multi-file or reviewable work | Evidence/decision links, requirements, criteria, tasks, verification |
| Program | Irreversible, high-risk, multi-session, or cross-team work | Standard record plus explicit risk, rollback, independent verification, and human gates |

Autonomy progresses only from advice, to inspection/recommendation, to drafting, to isolated implementation, to bounded repair. Each level can prepare the next, but does not grant it. Humans retain acceptance of normative decisions, risk exceptions, contract changes, merge, and deploy. An implementation agent never approves its own criteria.

## Risk, reversibility, and human boundaries

Classify blast radius before execution: affected users/data/systems, reversibility, privilege, external effects, and uncertainty. Prefer subtraction, existing capability, Node.js built-ins, native Claude Code features, and existing dependencies before new mechanism. If the smallest safe change is uncertain, inspect, research, or prototype first; do not create a universal checklist, permanent memory, or generic builder swarm.

Threats include untrusted instructions/evidence, stale or fabricated context, confused authority, hidden scope expansion, shared-write races, privilege/permission escalation, unreviewed destructive changes, and verification theater. Mitigate with provenance, typed boundaries, revision stamps, isolated worktrees where applicable, least privilege, deterministic validation, fresh-context verification, bounded repair, and explicit human approval at the boundaries above.

## Claude Code mechanism boundary

| Mechanism | Approved role | Boundary |
| --- | --- | --- |
| Dynamic Workflows | Bounded, non-interactive research DAGs | JavaScript owns branching, fan-out, limits, aggregation, and return values; do not build a giant engineering workflow. Workflow stages inherit the session allowlist and run in `acceptEdits`, so role isolation there is behavioral. |
| Main session and user-facing skills | Interactive engineering control and decision routing | They collect context, present choices, and maintain the human boundary; they are not enforcement. |
| Custom subagents | Bounded isolated judgment, implementation, or review | Use explicit tools/permissions and `isolation: worktree` when risk warrants. Worktree isolation starts from the default branch, so the intended base revision must be recorded and checked. |
| Node.js and Ajv | Canonical structural validation and deterministic enforcement | They validate contracts and evidence; they do not make semantic or normative decisions. |
| LSP, search, optional graph providers | Revision-stamped repository intelligence | Derived retrieval aids only; no inferred result becomes canonical or authorization. |
| Runtime, tests, and browser evidence | Behavioral proof | Record command/session, revision, environment, and result; static checks do not become runtime proof. |

This boundary reflects Claude Code 2.1.220 local help and the current official [workflows](https://code.claude.com/docs/en/workflows), [subagents](https://code.claude.com/docs/en/sub-agents), [skills](https://code.claude.com/docs/en/skills), [hooks](https://code.claude.com/docs/en/hooks), [permissions](https://code.claude.com/docs/en/permissions), and [large-codebase](https://code.claude.com/docs/en/large-codebases) documentation. It is a design decision, not a claim that this milestone executed Claude Code.

## Promotion, drift, and provenance

No delivery artifact promotes merely because a test passed. Promotion requires each accepted criterion to have proportional proof, including runtime or browser evidence where the criterion demands behavior. Record evidence source/revision, decision and authorization, contract/criterion/task identifiers, implementing revision, verifier identity/context, commands or runtime session, results, exceptions, and unresolved risks. Preserve historical evidence as historical; later decisions may supersede it but cannot rewrite it.

When drift is detected, stop the affected work, re-read the changed canonical input, regenerate derived context, and re-authorize if scope, risk, or criteria changed. A human resolves value judgments, conflicting priorities, irreversible actions, exceptions, and merge/deploy; the system may surface the smallest decision needed but must not guess it.

## Non-goals and next boundary

This milestone creates no schema, installer, executor, workflow, service, database, dependency, or autonomous merge/deploy path. Milestones 48–59 may add only the mechanisms their gates authorize; the existing Milestone 46 runtime-acceptance gate remains open.
