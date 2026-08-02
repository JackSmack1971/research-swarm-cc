import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../../engineering/schemas/authoritative-evidence.schema.json' with { type: 'json' };
import { validateRepositoryEvidence } from './repository-intelligence.mjs';

const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addFormat('date-time', { type: 'string', validate: (value) => !Number.isNaN(Date.parse(value)) });
const validate = ajv.compile(schema);
const now = () => new Date().toISOString();
const semver = (value) => { const match = String(value).trim().match(/^(\d+)\.(\d+)\.(\d+)/); return match ? match.slice(1).map(Number) : null; };
const compare = (left, right) => { const a = semver(left); const b = semver(right); if (!a || !b) return null; for (let i = 0; i < 3; i += 1) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1; return 0; };
function matches(version, range) { if (!version) return null; const comparison = compare(version, String(range).replace(/^[<>= ]+/, '')); if (comparison === null) return String(version) === String(range).trim(); const value = String(range).trim(); if (value.startsWith('<=')) return comparison <= 0; if (value.startsWith('>=')) return comparison >= 0; if (value.startsWith('<')) return comparison < 0; if (value.startsWith('>')) return comparison > 0; if (value.startsWith('=')) return comparison === 0; return comparison === 0; }

export function validateAuthoritativeEvidence(value) { return validate(value) ? { valid: true, errors: [] } : { valid: false, errors: validate.errors }; }

export function createAuthoritativeLookupRequest({ need, repositoryEvidence, lookupKind, now: clock = now }) {
  if (!need?.knowledge_need_id || !['version', 'release', 'compatibility', 'advisory'].includes(lookupKind)) throw new Error('A valid knowledge need and supported lookup kind are required.');
  if (!validateRepositoryEvidence(repositoryEvidence).valid || !repositoryEvidence.dependency) throw new Error('T1 lookup requires validated T0 dependency metadata.');
  const { name, declared_version, resolved_version } = repositoryEvidence.dependency;
  if (!need.scope.dependencies.includes(name)) throw new Error(`T1 package ${name} is outside the knowledge-need scope.`);
  const version = resolved_version ?? declared_version;
  return { schema_version: '1.0.0', request_id: `aer_${need.knowledge_need_id.slice(3)}`, lookup_kind: lookupKind, ecosystem: 'npm', package: name, repository_version: lookupKind === 'advisory' ? resolved_version : version, requested_version: need.scope.versions.length === 1 ? need.scope.versions[0] : null, allowed_sources: lookupKind === 'advisory' ? ['official-advisory'] : ['official-registry', 'official-release'], requested_at: clock() };
}

export async function lookupAuthoritative({ need, repositoryEvidence, lookupKind, retrieve, now: clock = now }) {
  const request = createAuthoritativeLookupRequest({ need, repositoryEvidence, lookupKind, now: clock });
  if (typeof retrieve !== 'function') throw new Error('T1 retrieval must be supplied by the Claude Code-native caller.');
  const response = await retrieve(Object.freeze({ ...request }));
  const source = response?.source;
  const records = Array.isArray(response?.records) ? response.records : [];
  const gaps = [];
  const conflicts = [];
  if (!source?.authority || !request.allowed_sources.includes(source.source_kind)) gaps.push('Retrieved source is missing approved authority or source kind.');
  if (!source?.locator || !source.retrieved_at) gaps.push('Source locator and retrieval time are required.');
  if (response?.status === 'ambiguous' || records.length > 1) conflicts.push('Authoritative retrieval returned multiple or ambiguous records.');
  const security = lookupKind === 'advisory' ? { affected_version_evidence: records.map(({ affected_versions, id }) => { const ranges = Array.isArray(affected_versions) ? affected_versions : []; return { id: id ?? null, affected_versions: ranges, matches_repository_version: ranges.length ? ranges.some((range) => matches(request.repository_version, range)) : null }; }), exploitability: 'not_assessed' } : undefined;
  const reasons = [...gaps, ...conflicts];
  if (response?.status === 'unavailable' || response?.status === 'not_found') reasons.push(`Authoritative source status is ${response.status}.`);
  const escalation = reasons.length ? { required: true, tier: lookupKind === 'advisory' ? 'T3' : 'T2', reasons } : { required: false, tier: 'none', reasons: [] };
  const evidence = { schema_version: '1.0.0', evidence_id: `aev_${request.request_id.slice(4)}`, knowledge_need_id: need.knowledge_need_id, lookup_kind: lookupKind, scope: { ecosystem: request.ecosystem, package: request.package, repository_version: request.repository_version, requested_version: request.requested_version }, provenance: { authority: source?.authority ?? 'official', source_kind: source?.source_kind ?? 'unavailable', locator: source?.locator ?? 'unavailable', retrieved_at: source?.retrieved_at ?? clock(), freshness: source?.freshness ?? 'unknown' }, result: { status: response?.status ?? 'unavailable', records }, conflicts, unresolved_gaps: gaps, escalation, ...(security ? { security } : {}), non_authorizing: true };
  if (security) evidence.security = security;
  const result = validateAuthoritativeEvidence(evidence);
  if (!result.valid) throw new Error(`Invalid authoritative evidence: ${JSON.stringify(result.errors)}`);
  return evidence;
}
