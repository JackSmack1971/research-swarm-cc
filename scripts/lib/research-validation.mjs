import path from 'node:path';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';
import { readJsonl } from './jsonl.mjs';
import { canonicalSchemas, enumValues, idPatterns } from './research-contracts.generated.mjs';

const REQUIRED_PATHS = {
  plan: 'plan.json', sources: 'sources.jsonl', claims: 'claims.jsonl',
  discarded_claims: 'discarded-claims.jsonl', verification_events: 'verification-events.jsonl',
  conflicts: 'conflicts.json', coverage_gaps: 'coverage-gaps.json', semantic_validation: 'semantic-validation.json', repair_events: 'repair-events.jsonl', report: 'report.md', report_map: 'report-map.json', validation: 'validation.json',
};
const MATERIALITY = new Set(enumValues.materiality);
const CONFIDENCE = new Set(enumValues.confidence);
const OUTCOMES = new Set(enumValues.outcome);
const DEFINITIVE_TYPES = new Set(['primary_data', 'official_record', 'standard', 'filing']);
const ID_PATTERNS = Object.fromEntries(Object.entries(idPatterns).map(([key, pattern]) => [key, new RegExp(pattern)]));

function error(errors, file, entityId, rule, message) {
  errors.push({ file, entity_id: entityId ?? null, rule, message });
}

function required(value) { return typeof value === 'string' && value.trim() !== ''; }

function isDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function contractValidators() {
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
  ajv.addFormat('date', { type: 'string', validate: isDate });
  ajv.addFormat('date-time', { type: 'string', validate: (value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && isDate(value.slice(0, 10)) && !Number.isNaN(Date.parse(value)) });
  ajv.addFormat('uri', { type: 'string', validate: (value) => { try { const parsed = new URL(value); return Boolean(parsed.protocol && parsed.hostname); } catch { return false; } } });
  for (const schema of canonicalSchemas) ajv.addSchema(schema);
  return Object.fromEntries(canonicalSchemas.map((schema) => [schema.$id, ajv.getSchema(schema.$id)]));
}

function validateContract(validate, record, file, entityId, errors) {
  if (!validate || validate(record)) return;
  for (const issue of validate.errors ?? []) error(errors, file, entityId, `schema.${issue.keyword}`, `${issue.instancePath || '/'} ${issue.message} (${issue.schemaPath}).`);
}

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

const REPORT_ANCHOR = /^<!--\s*report-unit:(rpt_[A-Za-z0-9][A-Za-z0-9_-]*):(start|end)\s*-->$/;
const REPORT_ANCHOR_LIKE = /<!--\s*report-unit:[\s\S]*?-->/g;

export function normalizeReportUnitText(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').replace(REPORT_ANCHOR_LIKE, '').split('\n');
  while (lines.length && /^\s*$/.test(lines[0])) lines.shift();
  while (lines.length && /^\s*$/.test(lines.at(-1))) lines.pop();
  return lines.join('\n');
}

export function reportUnitSha256(text) {
  return createHash('sha256').update(normalizeReportUnitText(text), 'utf8').digest('hex');
}

function isPresentationalReportLine(line) {
  const text = line.trim();
  return !text || /^#{1,6}(?:\s|$)/.test(text) || /^(?:[-*_]\s*){3,}$/.test(text) || /^\|?(?:\s*:?-{3,}:?\s*\|)+$/.test(text) || /^<!--.*-->$/.test(text);
}

function inspectReportAnchors(report, reportMap, errors) {
  const units = new Map((reportMap?.report_units ?? []).map((unit) => [unit.report_unit_id, unit]));
  const markers = new Map();
  const enclosed = new Map();
  const lines = String(report).replace(/\r\n?/g, '\n').split('\n');
  let fence = null;
  let open = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1][0];
      else if (fence === fenceMatch[1][0]) fence = null;
      continue;
    }
    if (fence) continue;
    const looksLikeAnchor = /<!--\s*report-unit:/.test(line);
    const marker = line.trim().match(REPORT_ANCHOR);
    if (looksLikeAnchor && !marker) {
      error(errors, 'report.md', null, 'report.anchor.unknown', `Unknown report-unit marker on line ${index + 1}.`);
      continue;
    }
    if (marker) {
      const [, id, kind] = marker;
      const record = markers.get(id) ?? { starts: [], ends: [] };
      record[`${kind}s`].push(index);
      markers.set(id, record);
      if (record[`${kind}s`].length > 1) error(errors, 'report.md', id, 'report.anchor.duplicate', `Duplicate ${kind} marker for ${id}.`);
      if (kind === 'start') {
        if (open) error(errors, 'report.md', id, 'report.anchor.nested', `${id} starts before ${open.id} ends.`);
        else open = { id, start: index };
      } else if (!open) {
        error(errors, 'report.md', id, 'report.anchor.order', `${id} ends before its start marker.`);
      } else if (open.id !== id) {
        error(errors, 'report.md', id, 'report.anchor.order', `${id} ends while ${open.id} is open.`);
      } else {
        enclosed.set(id, lines.slice(open.start + 1, index).join('\n'));
        open = null;
      }
      continue;
    }
    if (!open && !isPresentationalReportLine(line)) error(errors, 'report.md', null, 'report.prose.unanchored', `Material report prose on line ${index + 1} is outside a report unit.`);
  }
  if (open) error(errors, 'report.md', open.id, 'report.anchor.missing_end', `Missing end marker for ${open.id}.`);
  for (const [id, record] of markers) {
    if (record.starts.length !== 1 || record.ends.length !== 1) error(errors, 'report.md', id, 'report.anchor.pair', `${id} must have exactly one start and one end marker.`);
    if (!units.has(id)) error(errors, 'report.md', id, 'report.anchor.map', `Report marker ${id} has no report-map entry.`);
  }
  for (const [id, unit] of units) {
    const record = markers.get(id);
    if (!record || record.starts.length !== 1 || record.ends.length !== 1 || !enclosed.has(id)) {
      error(errors, 'report-map.json', id, 'report_map.anchor', `Report map entry ${id} must have exactly one enclosed report unit.`);
      continue;
    }
    const normalized = normalizeReportUnitText(enclosed.get(id));
    if (!normalized) error(errors, 'report.md', id, 'report.anchor.empty', `Report unit ${id} is empty.`);
    else if (reportUnitSha256(enclosed.get(id)) !== unit.text_sha256) error(errors, 'report-map.json', id, 'report_map.text_sha256', `text_sha256 does not match normalized report prose for ${id}.`);
  }
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
  const validators = contractValidators();
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
  const coverageGaps = files.coverage_gaps && await readJson(files.coverage_gaps, errors);
  const semanticValidation = files.semantic_validation && await readJson(files.semantic_validation, errors);
  const reportMap = files.report_map && await readJson(files.report_map, errors);
  const validation = files.validation && await readJson(files.validation, errors);
  let report = '';
  if (files.report) {
    try { report = await readFile(files.report, 'utf8'); }
    catch (cause) { error(errors, 'report.md', null, 'file.required', `Missing or unreadable report: ${cause.message}`); }
  }
  if (!Array.isArray(conflicts)) error(errors, 'conflicts.json', null, 'conflicts.array', 'Conflicts must be a JSON array.');
  if (!Array.isArray(coverageGaps)) error(errors, 'coverage-gaps.json', null, 'coverage_gaps.array', 'Coverage gaps must be a JSON array.');
  if (!Array.isArray(reportMap?.report_units)) error(errors, 'report-map.json', reportMap?.report_map_id, 'report_map.units', 'report_units must be an array.');
  if (!required(plan?.plan_id)) error(errors, 'plan.json', null, 'plan.plan_id', 'Plan must include plan_id.');
  else if (!ID_PATTERNS.plan_id.test(plan.plan_id)) error(errors, 'plan.json', plan.plan_id, 'plan.plan_id.format', 'plan_id must use the canonical plan_ identifier format.');
  if (!ID_PATTERNS.run_id.test(manifest.run_id ?? '')) error(errors, 'manifest.json', manifest.run_id, 'manifest.run_id.format', 'run_id must use the canonical run_ identifier format.');
  if (!ID_PATTERNS.plan_id.test(manifest.plan_id ?? '')) error(errors, 'manifest.json', manifest.run_id, 'manifest.plan_id.format', 'manifest plan_id must use the canonical plan_ identifier format.');
  if (!ID_PATTERNS.report_map_id.test(reportMap?.report_map_id ?? '')) error(errors, 'report-map.json', reportMap?.report_map_id, 'report_map.report_map_id.format', 'report_map_id must use the canonical rmap_ identifier format.');
  if (manifest.plan_id !== plan?.plan_id) error(errors, 'manifest.json', manifest.run_id, 'manifest.plan_id', 'Manifest plan_id must match plan.json.');
  if (typeof validation?.valid !== 'boolean') error(errors, 'validation.json', null, 'validation.status', 'validation.json must include boolean valid.');

  const jsonl = {};
  for (const key of ['sources', 'claims', 'discarded_claims', 'verification_events', 'repair_events']) {
    jsonl[key] = files[key] ? await readJsonl(files[key]) : { records: [], errors: [] };
    for (const issue of jsonl[key].errors) error(errors, path.basename(issue.file), null, 'jsonl.parse', `Line ${issue.line ?? '?'}: ${issue.message}`);
  }
  const sources = jsonl.sources.records;
  const claims = jsonl.claims.records;
  const discarded = jsonl.discarded_claims.records;
  const events = jsonl.verification_events.records;
  const repairEvents = jsonl.repair_events.records;
  const sourceIds = unique(sources, 'source_id', 'sources.jsonl', errors);
  const claimIds = unique(claims, 'claim_id', 'claims.jsonl', errors);
  const discardedIds = unique(discarded, 'claim_id', 'discarded-claims.jsonl', errors);
  unique(events, 'verification_event_id', 'verification-events.jsonl', errors);
  unique(repairEvents, 'repair_event_id', 'repair-events.jsonl', errors);
  unique(Array.isArray(coverageGaps) ? coverageGaps : [], 'coverage_gap_id', 'coverage-gaps.json', errors);
  unique(Array.isArray(conflicts) ? conflicts : [], 'conflict_id', 'conflicts.json', errors);
  unique(reportMap?.report_units ?? [], 'report_unit_id', 'report-map.json', errors);

  validateContract(validators['run-manifest.schema.json'], manifest, 'manifest.json', manifest.run_id, errors);
  validateContract(validators['research-plan.schema.json'], plan, 'plan.json', plan?.plan_id, errors);
  validateContract(validators['report-map.schema.json'], reportMap, 'report-map.json', reportMap?.report_map_id, errors);
  for (const source of sources) validateContract(validators['source.schema.json'], source, 'sources.jsonl', source?.source_id, errors);
  for (const claim of claims) validateContract(validators['claim.schema.json'], claim, 'claims.jsonl', claim?.claim_id, errors);
  for (const claim of discarded) validateContract(validators['discarded-claim.schema.json'], claim, 'discarded-claims.jsonl', claim?.claim_id, errors);
  for (const event of events) validateContract(validators['verification-event.schema.json'], event, 'verification-events.jsonl', event?.verification_event_id, errors);
  for (const conflict of Array.isArray(conflicts) ? conflicts : []) validateContract(validators['conflict.schema.json'], conflict, 'conflicts.json', conflict?.conflict_id, errors);
  for (const gap of Array.isArray(coverageGaps) ? coverageGaps : []) validateContract(validators['coverage-gap.schema.json'], gap, 'coverage-gaps.json', gap?.coverage_gap_id, errors);
  validateContract(validators['semantic-validation.schema.json'], semanticValidation, 'semantic-validation.json', semanticValidation?.semantic_validation_id, errors);
  for (const event of repairEvents) validateContract(validators['repair-event.schema.json'], event, 'repair-events.jsonl', event?.repair_event_id, errors);

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
    if (!claimIds.has(event?.claim_id) && !discardedIds.has(event?.claim_id)) error(errors, 'verification-events.jsonl', id, 'verification.claim', `Unknown claim_id ${event?.claim_id ?? '(missing)'}.`);
    if (!OUTCOMES.has(event?.outcome)) error(errors, 'verification-events.jsonl', id, 'verification.outcome', 'Verification outcome is invalid.');
    for (const sourceId of event?.checked_source_ids ?? []) if (!sourceIds.has(sourceId)) error(errors, 'verification-events.jsonl', id, 'verification.source', `Unknown checked source_id ${sourceId}.`);
    const localSourceIds = new Set((event?.new_sources ?? []).map(({ source_id }) => source_id));
    if (localSourceIds.size !== (event?.new_sources ?? []).length) error(errors, 'verification-events.jsonl', id, 'verification.new_source.unique', 'Verifier-local source IDs must be unique within an event.');
    for (const evidence of event?.new_evidence ?? []) if (!sourceIds.has(evidence?.source_id) && !localSourceIds.has(evidence?.source_id)) error(errors, 'verification-events.jsonl', id, 'verification.new_evidence.source', `Unknown verifier evidence source_id ${evidence?.source_id ?? '(missing)'}.`);
  }
  const eventIds = new Set(events.map(({ verification_event_id }) => verification_event_id));
  for (const claim of discarded) {
    for (const eventId of claim?.verification_event_ids ?? []) if (!eventIds.has(eventId)) error(errors, 'discarded-claims.jsonl', claim?.claim_id, 'discarded_claim.verification_events', `Unknown verification_event_id ${eventId}.`);
  }

  const mappedClaims = new Set();
  for (const unit of reportMap?.report_units ?? []) {
    for (const id of unit?.claim_ids ?? []) { mappedClaims.add(id); if (!claimIds.has(id)) error(errors, 'report-map.json', unit?.report_unit_id, 'report_map.claim', `Unknown or discarded claim_id ${id}.`); }
    if (unit?.is_inference && (!Array.isArray(unit.premise_claim_ids) || unit.premise_claim_ids.length === 0)) error(errors, 'report-map.json', unit?.report_unit_id, 'report_map.inference', 'Inference report units require premise_claim_ids.');
    for (const id of unit?.premise_claim_ids ?? []) if (!claimIds.has(id)) error(errors, 'report-map.json', unit?.report_unit_id, 'report_map.premise', `Unknown premise claim_id ${id}.`);
  }
  for (const claim of claims.filter((item) => ['critical', 'high'].includes(item?.materiality))) if (!mappedClaims.has(claim.claim_id)) error(errors, 'report-map.json', claim.claim_id, 'report_map.key_claim', 'Every critical or high-materiality claim must appear in the report map.');

  for (const conflict of Array.isArray(conflicts) ? conflicts : []) {
    for (const id of conflict?.claim_ids ?? []) if (!claimIds.has(id) && !discardedIds.has(id)) error(errors, 'conflicts.json', conflict?.conflict_id, 'conflict.claim', `Unknown claim_id ${id}.`);
    for (const id of conflict?.supporting_source_ids ?? []) if (!sourceIds.has(id)) error(errors, 'conflicts.json', conflict?.conflict_id, 'conflict.source', `Unknown source_id ${id}.`);
    const material = (conflict?.claim_ids ?? []).some((id) => ['critical', 'high'].includes(claims.find((claim) => claim.claim_id === id)?.materiality));
    if (conflict?.status === 'unresolved' && material && !(conflict.claim_ids ?? []).some((id) => mappedClaims.has(id))) error(errors, 'report-map.json', conflict.conflict_id, 'conflict.report_map', 'An unresolved material conflict must be represented in the report map.');
  }
  inspectReportAnchors(report, reportMap, errors);
  for (const gap of Array.isArray(coverageGaps) ? coverageGaps : []) for (const claimId of gap?.related_claim_ids ?? []) if (!claimIds.has(claimId) && !discardedIds.has(claimId)) error(errors, 'coverage-gaps.json', gap?.coverage_gap_id, 'coverage_gap.claim', `Unknown claim_id ${claimId}.`);

  const counts = { sources: sources.length, claims: claims.length, retained_claims: claims.length, discarded_claims: discarded.length, verification_events: events.length, conflicts: Array.isArray(conflicts) ? conflicts.length : 0, coverage_gaps: Array.isArray(coverageGaps) ? coverageGaps.length : 0, semantic_validations: semanticValidation ? 1 : 0, repair_events: repairEvents.length, report_units: reportMap?.report_units?.length ?? 0 };
  for (const [key, actual] of Object.entries(counts)) if (manifest.counts?.[key] !== actual) error(errors, 'manifest.json', manifest.run_id, 'manifest.counts', `Count for ${key} is ${manifest.counts?.[key] ?? '(missing)'}, expected ${actual}.`);
  const valid = errors.length === 0;
  if (validation && validation.valid !== valid) error(errors, 'validation.json', null, 'validation.status', `validation.json valid must be ${valid}.`);
  return { valid: errors.length === 0, run_directory: runDirectory, errors, counts };
}
