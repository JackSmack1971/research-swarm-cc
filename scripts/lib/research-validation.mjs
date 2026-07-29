import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { readJsonl } from './jsonl.mjs';

const REQUIRED_PATHS = {
  plan: 'plan.json', sources: 'sources.jsonl', claims: 'claims.jsonl',
  discarded_claims: 'discarded-claims.jsonl', verification_events: 'verification-events.jsonl',
  conflicts: 'conflicts.json', report: 'report.md', report_map: 'report-map.json', validation: 'validation.json',
};
const MATERIALITY = new Set(['critical', 'high', 'medium', 'low']);
const CONFIDENCE = new Set(['high', 'medium', 'low']);
const OUTCOMES = new Set(['confirmed', 'confirmed_with_qualification', 'demoted', 'contradicted', 'unverifiable', 'discarded']);
const DEFINITIVE_TYPES = new Set(['primary_data', 'official_record', 'standard', 'filing']);
const ID_PATTERNS = {
  run_id: /^run_[A-Za-z0-9][A-Za-z0-9_-]*$/,
  plan_id: /^plan_[A-Za-z0-9][A-Za-z0-9_-]*$/,
  source_id: /^src_[A-Za-z0-9][A-Za-z0-9_-]*$/,
  claim_id: /^clm_[A-Za-z0-9][A-Za-z0-9_-]*$/,
  verification_event_id: /^ver_[A-Za-z0-9][A-Za-z0-9_-]*$/,
  conflict_id: /^conf_[A-Za-z0-9][A-Za-z0-9_-]*$/,
  report_map_id: /^rmap_[A-Za-z0-9][A-Za-z0-9_-]*$/,
  report_unit_id: /^rpt_[A-Za-z0-9][A-Za-z0-9_-]*$/,
};

function error(errors, file, entityId, rule, message) {
  errors.push({ file, entity_id: entityId ?? null, rule, message });
}

function required(value) { return typeof value === 'string' && value.trim() !== ''; }

function unique(records, key, file, errors) {
  const seen = new Set();
  for (const record of records) {
    const id = record?.[key];
    if (!required(id)) error(errors, file, null, `${key}.required`, `Missing ${key}.`);
    else {
      if (ID_PATTERNS[key] && !ID_PATTERNS[key].test(id)) error(errors, file, id, `${key}.format`, `${key} must use the canonical identifier format.`);
      if (seen.has(id)) error(errors, file, id, `${key}.unique`, `Duplicate ${key}.`);
      else seen.add(id);
    }
  }
  return seen;
}

function hasPlaceholderUrl(url) {
  return /(?:example\.com|example\.org|localhost|127\.0\.0\.1|<|\{\{|placeholder)/i.test(url);
}

async function readJson(file, errors) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (cause) { error(errors, file, null, 'json.parse', `Invalid or unreadable JSON: ${cause.message}`); return null; }
}

function validatePath(runDirectory, value, key, errors) {
  if (!required(value)) { error(errors, 'manifest.json', null, 'manifest.paths', `Missing path for ${key}.`); return null; }
  const resolved = path.resolve(runDirectory, value);
  if (resolved !== runDirectory && !resolved.startsWith(`${runDirectory}${path.sep}`)) {
    error(errors, 'manifest.json', null, 'manifest.paths', `Path for ${key} escapes the run directory.`);
    return null;
  }
  return resolved;
}

export async function validateResearchRun(directory) {
  const runDirectory = path.resolve(directory);
  const errors = [];
  const manifestFile = path.join(runDirectory, 'manifest.json');
  const manifest = await readJson(manifestFile, errors);
  if (!manifest || typeof manifest !== 'object') return { valid: false, run_directory: runDirectory, errors, counts: {} };

  const files = {};
  for (const [key, fallback] of Object.entries(REQUIRED_PATHS)) {
    const declared = manifest.paths?.[key];
    if (declared !== fallback) error(errors, 'manifest.json', manifest.run_id, 'manifest.paths', `Path for ${key} must be ${fallback}.`);
    files[key] = validatePath(runDirectory, declared ?? fallback, key, errors);
  }
  if (path.resolve(manifest.run_directory ?? '') !== runDirectory) {
    error(errors, 'manifest.json', manifest.run_id, 'manifest.run_directory', 'Manifest run_directory must identify this run directory.');
  }

  const plan = files.plan && await readJson(files.plan, errors);
  const conflicts = files.conflicts && await readJson(files.conflicts, errors);
  const reportMap = files.report_map && await readJson(files.report_map, errors);
  const validation = files.validation && await readJson(files.validation, errors);
  if (files.report) {
    try { await readFile(files.report, 'utf8'); }
    catch (cause) { error(errors, 'report.md', null, 'file.required', `Missing or unreadable report: ${cause.message}`); }
  }
  if (!Array.isArray(conflicts)) error(errors, 'conflicts.json', null, 'conflicts.array', 'Conflicts must be a JSON array.');
  if (!Array.isArray(reportMap?.report_units)) error(errors, 'report-map.json', reportMap?.report_map_id, 'report_map.units', 'report_units must be an array.');
  if (!required(plan?.plan_id)) error(errors, 'plan.json', null, 'plan.plan_id', 'Plan must include plan_id.');
  else if (!ID_PATTERNS.plan_id.test(plan.plan_id)) error(errors, 'plan.json', plan.plan_id, 'plan.plan_id.format', 'plan_id must use the canonical plan_ identifier format.');
  if (!ID_PATTERNS.run_id.test(manifest.run_id ?? '')) error(errors, 'manifest.json', manifest.run_id, 'manifest.run_id.format', 'run_id must use the canonical run_ identifier format.');
  if (!ID_PATTERNS.plan_id.test(manifest.plan_id ?? '')) error(errors, 'manifest.json', manifest.run_id, 'manifest.plan_id.format', 'manifest plan_id must use the canonical plan_ identifier format.');
  if (!ID_PATTERNS.report_map_id.test(reportMap?.report_map_id ?? '')) error(errors, 'report-map.json', reportMap?.report_map_id, 'report_map.report_map_id.format', 'report_map_id must use the canonical rmap_ identifier format.');
  if (manifest.plan_id !== plan?.plan_id) error(errors, 'manifest.json', manifest.run_id, 'manifest.plan_id', 'Manifest plan_id must match plan.json.');
  if (typeof validation?.valid !== 'boolean') error(errors, 'validation.json', null, 'validation.status', 'validation.json must include boolean valid.');

  const jsonl = {};
  for (const key of ['sources', 'claims', 'discarded_claims', 'verification_events']) {
    jsonl[key] = files[key] ? await readJsonl(files[key]) : { records: [], errors: [] };
    for (const issue of jsonl[key].errors) error(errors, path.basename(issue.file), null, 'jsonl.parse', `Line ${issue.line ?? '?'}: ${issue.message}`);
  }
  const sources = jsonl.sources.records;
  const claims = jsonl.claims.records;
  const discarded = jsonl.discarded_claims.records;
  const events = jsonl.verification_events.records;
  const sourceIds = unique(sources, 'source_id', 'sources.jsonl', errors);
  const claimIds = unique(claims, 'claim_id', 'claims.jsonl', errors);
  const discardedIds = unique(discarded, 'claim_id', 'discarded-claims.jsonl', errors);
  unique(events, 'verification_event_id', 'verification-events.jsonl', errors);
  unique(Array.isArray(conflicts) ? conflicts : [], 'conflict_id', 'conflicts.json', errors);
  unique(reportMap?.report_units ?? [], 'report_unit_id', 'report-map.json', errors);

  for (const source of sources) {
    const id = source?.source_id;
    if (!required(source?.title)) error(errors, 'sources.jsonl', id, 'source.title', 'Source title is required.');
    if (!required(source?.publisher)) error(errors, 'sources.jsonl', id, 'source.publisher', 'Source publisher is required.');
    if (!required(source?.source_type)) error(errors, 'sources.jsonl', id, 'source.source_type', 'Source type is required.');
    if (!required(source?.access_date)) error(errors, 'sources.jsonl', id, 'source.access_date', 'Source access_date is required.');
    if (!required(source?.independence_group)) error(errors, 'sources.jsonl', id, 'source.independence_group', 'Source independence_group is required.');
    else if (!/^ig_[A-Za-z0-9][A-Za-z0-9_-]*$/.test(source.independence_group)) error(errors, 'sources.jsonl', id, 'source.independence_group', 'independence_group must use the canonical ig_ identifier format.');
    if (!required(source?.url) && !required(source?.doi)) error(errors, 'sources.jsonl', id, 'source.identifier', 'Source requires a URL or DOI.');
    if (required(source?.url) && hasPlaceholderUrl(source.url)) error(errors, 'sources.jsonl', id, 'source.url', 'Placeholder URLs are not allowed.');
  }

  for (const claim of [...claims, ...discarded]) {
    const file = claimIds.has(claim?.claim_id) ? 'claims.jsonl' : 'discarded-claims.jsonl';
    const id = claim?.claim_id;
    if (!MATERIALITY.has(claim?.materiality)) error(errors, file, id, 'claim.materiality', 'Materiality must be critical, high, medium, or low.');
    if (!CONFIDENCE.has(claim?.confidence)) error(errors, file, id, 'claim.confidence', 'Confidence must be high, medium, or low.');
    for (const evidence of [...(claim?.supporting_evidence ?? []), ...(claim?.counter_evidence ?? [])]) {
      if (!sourceIds.has(evidence?.source_id)) error(errors, file, id, 'claim.evidence.source', `Unknown source_id ${evidence?.source_id ?? '(missing)'}.`);
      if (!required(evidence?.locator)) error(errors, file, id, 'claim.evidence.locator', 'Evidence locator is required.');
    }
    for (const conflictId of claim?.conflicts_with ?? []) {
      if (!claimIds.has(conflictId) && !discardedIds.has(conflictId)) error(errors, file, id, 'claim.conflict', `Unknown conflicting claim_id ${conflictId}.`);
    }
    if (claim?.claim_type === 'inference' && (!Array.isArray(claim.premise_claim_ids) || claim.premise_claim_ids.length === 0)) error(errors, file, id, 'claim.inference.premises', 'Inference claims require premise_claim_ids.');
    if (claimIds.has(id) && (!Array.isArray(claim?.supporting_evidence) || claim.supporting_evidence.length === 0)) error(errors, file, id, 'claim.evidence', 'Retained claims require supporting evidence.');
  }
  for (const id of claimIds) if (discardedIds.has(id)) error(errors, 'discarded-claims.jsonl', id, 'claim.retained_discarded', 'A claim cannot be both retained and discarded.');

  for (const claim of claims.filter((item) => item?.confidence === 'high')) {
    const supporting = claim.supporting_evidence ?? [];
    const groups = new Set(supporting.map((e) => sources.find((s) => s.source_id === e.source_id)?.independence_group).filter(Boolean));
    const definitive = supporting.some((e) => DEFINITIVE_TYPES.has(sources.find((s) => s.source_id === e.source_id)?.source_type));
    const rationale = claim.confidence_rationale ?? '';
    if (groups.size < 2 && !(definitive && /sufficien|definitive authority/i.test(rationale))) error(errors, 'claims.jsonl', claim.claim_id, 'claim.confidence.high', 'High confidence needs two independence groups or a definitive authority with an explicit sufficiency rationale.');
  }

  for (const event of events) {
    const id = event?.verification_event_id;
    if (!claimIds.has(event?.claim_id)) error(errors, 'verification-events.jsonl', id, 'verification.claim', `Unknown retained claim_id ${event?.claim_id ?? '(missing)'}.`);
    if (!OUTCOMES.has(event?.outcome)) error(errors, 'verification-events.jsonl', id, 'verification.outcome', 'Verification outcome is invalid.');
    for (const sourceId of event?.checked_source_ids ?? []) if (!sourceIds.has(sourceId)) error(errors, 'verification-events.jsonl', id, 'verification.source', `Unknown checked source_id ${sourceId}.`);
  }

  const mappedClaims = new Set();
  for (const unit of reportMap?.report_units ?? []) {
    for (const id of unit?.claim_ids ?? []) { mappedClaims.add(id); if (!claimIds.has(id)) error(errors, 'report-map.json', unit?.report_unit_id, 'report_map.claim', `Unknown or discarded claim_id ${id}.`); }
    if (unit?.is_inference && (!Array.isArray(unit.premise_claim_ids) || unit.premise_claim_ids.length === 0)) error(errors, 'report-map.json', unit?.report_unit_id, 'report_map.inference', 'Inference report units require premise_claim_ids.');
    for (const id of unit?.premise_claim_ids ?? []) if (!claimIds.has(id)) error(errors, 'report-map.json', unit?.report_unit_id, 'report_map.premise', `Unknown premise claim_id ${id}.`);
  }
  for (const claim of claims.filter((item) => ['critical', 'high'].includes(item?.materiality))) if (!mappedClaims.has(claim.claim_id)) error(errors, 'report-map.json', claim.claim_id, 'report_map.key_claim', 'Every critical or high-materiality claim must appear in the report map.');

  for (const conflict of Array.isArray(conflicts) ? conflicts : []) {
    for (const id of conflict?.claim_ids ?? []) if (!claimIds.has(id)) error(errors, 'conflicts.json', conflict?.conflict_id, 'conflict.claim', `Unknown retained claim_id ${id}.`);
    for (const id of conflict?.supporting_source_ids ?? []) if (!sourceIds.has(id)) error(errors, 'conflicts.json', conflict?.conflict_id, 'conflict.source', `Unknown source_id ${id}.`);
    const material = (conflict?.claim_ids ?? []).some((id) => ['critical', 'high'].includes(claims.find((claim) => claim.claim_id === id)?.materiality));
    if (conflict?.status === 'unresolved' && material && !(conflict.claim_ids ?? []).some((id) => mappedClaims.has(id))) error(errors, 'report-map.json', conflict.conflict_id, 'conflict.report_map', 'An unresolved material conflict must be represented in the report map.');
  }

  const counts = { sources: sources.length, claims: claims.length, retained_claims: claims.length, discarded_claims: discarded.length, verification_events: events.length, conflicts: Array.isArray(conflicts) ? conflicts.length : 0, report_units: reportMap?.report_units?.length ?? 0 };
  for (const [key, actual] of Object.entries(counts)) if (manifest.counts?.[key] !== actual) error(errors, 'manifest.json', manifest.run_id, 'manifest.counts', `Count for ${key} is ${manifest.counts?.[key] ?? '(missing)'}, expected ${actual}.`);
  const valid = errors.length === 0;
  if (validation && validation.valid !== valid) error(errors, 'validation.json', null, 'validation.status', `validation.json valid must be ${valid}.`);
  return { valid: errors.length === 0, run_directory: runDirectory, errors, counts };
}
