# Engineering Benchmark Harness

Milestone 56 measures future executor claims against a representative, disposable brownfield suite. It is not an executor and its fixtures never authorize production changes.

`tests/fixtures/engineering-benchmark/suite.json` defines one task each for local bug fixing, small and cross-file features, migration, isolated external-API adaptation, UI behavior, auth/security, dependency decision, and a human-required ambiguity. Run each task from a fresh copy of `safe-brownfield`; it is intentionally separate from this repository and contains no credentials, network calls, or production target.

Each immutable run uses `engineering-benchmark.schema.json`. It captures observed acceptance/first-pass results, repairs, human attention, exposed tool/model/token/time telemetry, regressions, complexity deltas, risk-gate outcomes, context cost, and unchanged raw evidence paths. Missing telemetry stays `null`; it is never estimated.

Use `node scripts/benchmark-engineering.mjs <run.json> [candidate-run.json]` to validate and collect one run or compare an equal suite. The comparator reports deltas and new safety regressions; it deliberately does not choose a winner or authorize implementation. The M56 baseline is plain Claude Code only: `--safe-mode --disable-slash-commands --no-session-persistence` disables project customizations while retaining subscription authentication, and runs only in a disposable fixture copy with bounded built-in tools. `--bare` would provide equivalent isolation but requires an API key in this environment; its failed login probe is not a benchmark result.

The committed baseline is an actual local-bug-fix run, not a prediction: Claude changed only the disposable fixture's one-line defect, then requested permission for `npm test`; the harness independently ran that test successfully. Its raw Claude JSON records the model/tool/cost/token/time fields the runtime exposed. The other suite tasks remain unexecuted baseline cases, not passed outcomes.
