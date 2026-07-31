# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Added documented safeguards for future adaptive research policy, including human review and rollback requirements.
- Added version-2 research archives with auditable learning records while keeping existing archives readable.

### Changed

- Research archives now declare a version and clearly reject unsupported older or newer formats.
- Research runs can now repair evidence, verification, and archive-format defects through one auditable two-round limit.
- Claude Code now launches the research workflow reliably before validating its request.
- Research workflow files now retain a compatible line format when checked out.
- Research runs now retain canonical-claim budget gaps through adjudication and archival.
- Research runs now retain narrowly scoped repair actions and return safe, stage-specific failure diagnostics.
- Research runs now apply bounded, risk-prioritized research and verification budgets with auditable escalation decisions.
- Research runs now reject unsafe archive paths and ignore instructions hidden in research material.
- Research reports now preserve an auditable hash link between each material passage and its supporting claims.
- Research archives now retain verification history, evidence gaps, semantic reviews, and repair records.
- Research archives now reject malformed evidence records before report-support checks run.
- Research verification now preserves and audits newly discovered supporting, qualifying, and contradictory evidence.
