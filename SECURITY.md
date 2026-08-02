# Security Policy

## Supported versions

This project has no tagged or package releases. Security fixes are considered for the current `main` branch only. When releases begin, this policy will list supported release lines and end-of-support dates.

## Scope

Please report vulnerabilities in this repository's Claude Code workflow and configuration, Node.js scripts, schemas and generated contracts, hooks, dependencies, or archive handling. Relevant examples include unsafe handling of untrusted retrieved content or paths, permission broadening, shell or process invocation, schema-validation bypasses, archive or secret exposure, and compromised dependencies.

Claude Code, GitHub, npm, and other third-party services are outside this repository's scope; report defects in those products to their providers. Public research content is not itself a security report unless it exploits this repository's code or configuration.

## Reporting a vulnerability

Do not open a public issue, pull request, or discussion with vulnerability details.

If this repository's **Security** tab shows **Report a vulnerability**, use that private GitHub report channel. It is the preferred route.

Private vulnerability reporting is not currently enabled for this repository. Until the maintainer enables it or publishes a monitored security address, use GitHub's documented fallback: open a contact-only issue asking for a private security channel, with a title such as `Security contact requested` and **no technical details**. A maintainer should provide a private channel before you disclose the issue. If that is not acceptable for the impact, do not disclose publicly.

Once a private channel is available, include:

- affected commit, file, configuration, or dependency;
- a minimal reproduction or proof of concept;
- impact and realistic attack conditions;
- environment and version information; and
- any safe mitigation or workaround you identified.

Do not send secrets, credentials, personal data, or live sensitive research content unless explicitly requested through the agreed private channel.

## Response and disclosure

Maintainers aim to acknowledge a private report within seven calendar days and provide a status update at least every 14 days while it is being handled. These are targets, not a guarantee of a fix or bounty.

Please allow time for validation and remediation before public disclosure. Maintainers will coordinate disclosure with the reporter when feasible. If a vulnerability is confirmed, maintainers will test the remedy and publish a GitHub Security Advisory when appropriate, including affected versions or commits, remediation or workaround, and credit only with the reporter's permission. A CVE may be requested when warranted.

## Good-faith research

Good-faith, non-disruptive research limited to this repository is welcome. Do not disrupt services, use social engineering, access or exfiltrate others' data, violate privacy, bypass authorization, or run high-volume automated testing. Follow applicable law and stop if asked by a maintainer. This policy does not grant permission to test third-party systems or waive legal rights.

## Project security practices

Run the documented offline checks before proposing a fix:

```sh
npm ci
npm run contracts:check
npm test
node scripts/validate-research-run.mjs tests/fixtures/valid-run-v2
```

Security fixes must preserve provenance, validation, archive-safety, and bounded-repair controls. Do not disclose a proof of concept in a public pull request until coordinated disclosure permits it.

Pre-execution authorization is a deterministic control record, not a runtime permission grant. Conditional security, privacy/integrity, migration, external-API, UI/accessibility, infrastructure, and dependency profiles retain activation evidence, relevant planning constraints, required proof kinds, failure recovery, and human boundaries; a missing or altered gate fails closed. No record authorizes automatic merge or deployment.

The bounded executor rechecks authorization and drift before isolated execution, blocks planning-state paths and scope escape, and records an unverified diff only. A separate fresh-context verifier receives no executor reasoning, records terminal criterion proofs, and can request at most two identified-defect repairs; command-only evidence cannot pass a runtime, browser, API, LSP, or security criterion. Neither role may use force operations, nested delegation, merge, push, deployment, or production side effects.

Greenfield plans are also untrusted input: generated paths must be relative and cannot escape the target, overwrite existing files, or alter planning-state directories. The builder validates the accepted contract and stack-decision lineage before writing, re-profiles the target afterward, and leaves deployment and integration to human-controlled boundaries.

Engineering-learning records are a separate untrusted input plane. Registration requires a digest-validated delivery handoff, explicit provenance, bounded applicability, and protected-surface rejection. Synthetic fixtures and the plain-Claude baseline cannot promote or activate lessons. The registry remains dormant until final Claude Code project acceptance provides a matching live-session attestation; learning directives cannot weaken provenance, verification, authorization, risk gates, permissions, security, the Engineering Constitution, research learning, merge, or deployment.
