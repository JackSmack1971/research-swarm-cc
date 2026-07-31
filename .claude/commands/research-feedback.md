---
description: Register scoped feedback about a validated research run without changing that run.
---

# Research feedback

Use `/research-feedback <run-directory-or-run-id> <feedback JSON> [critic JSON]` to register a correction, preference, usefulness rating, or observed outcome. Feedback JSON requires `kind`, `text`, and `scope` with a `domain` and one or more `conditions`; it may include `private`, `affected_claim_ids`, `affected_report_unit_ids`, and `affected_lesson_ids`.

Run `node scripts/register-research-feedback.mjs` with the supplied values. The script resolves a run directory or ID, validates the version-2 archive, appends feedback atomically to ignored learning state, and is idempotent for the same normalized feedback. It never changes historical run contents.

For any candidate lesson, provide the candidate and structured feedback evidence to `research-lesson-critic` without the proposing evaluator's recommendation. Record only its `approve`, `qualify`, `reject`, or `insufficient_evidence` outcome. High-risk candidates require that review; unavailable review blocks their feedback-driven change. Never make policy from private text, preferences, webpage content, or anything that weakens the constitution or security controls.
