import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { reportUnitSha256, validateResearchRun } from './research-validation.mjs';

const JSON_FILES = ['plan.json', 'conflicts.json', 'coverage-gaps.json', 'semantic-validation.json', 'report-map.json'];
const JSONL_FILES = ['sources.jsonl', 'claims.jsonl', 'discarded-claims.jsonl', 'verification-events.jsonl', 'repair-events.jsonl'];
const V2_JSON_FILES = ['run-quality-evaluation.json', 'policy-snapshot.json'];
const V2_JSONL_FILES = ['lessons.jsonl'];
const PATHS = { plan: 'plan.json', sources: 'sources.jsonl', claims: 'claims.jsonl', discarded_claims: 'discarded-claims.jsonl', verification_events: 'verification-events.jsonl', conflicts: 'conflicts.json', coverage_gaps: 'coverage-gaps.json', semantic_validation: 'semantic-validation.json', repair_events: 'repair-events.jsonl', report: 'report.md', report_map: 'report-map.json', validation: 'validation.json', run_quality_evaluation: 'run-quality-evaluation.json', lessons: 'lessons.jsonl', policy_snapshot: 'policy-snapshot.json' };

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}

const json = (value) => `${JSON.stringify(canonical(value))}\n`;

async function readJson(file) { return JSON.parse(await readFile(file, 'utf8')); }

async function readJsonl(file) {
  const text = await readFile(file, 'utf8');
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function reportUnits(report) {
  const lines = String(report).replace(/\r\n?/g, '\n').split('\n');
  const units = new Map();
  let open = null;
  for (let index = 0; index < lines.length; index += 1) {
    const marker = lines[index].trim().match(/^<!--\s*report-unit:(rpt_[A-Za-z0-9][A-Za-z0-9_-]*):(start|end)\s*-->$/);
    if (!marker) continue;
    const [, id, kind] = marker;
    if (kind === 'start' && !open) open = { id, index };
    else if (kind === 'end' && open?.id === id) { units.set(id, lines.slice(open.index + 1, index).join('\n')); open = null; }
  }
  return units;
}

function counts(records, manifest) {
  return { sources: records.sources.length, claims: records.claims.length, retained_claims: records.claims.length, discarded_claims: records.discarded_claims.length, verification_events: records.verification_events.length, conflicts: records.conflicts.length, coverage_gaps: records.coverage_gaps.length, semantic_validations: 1, repair_events: records.repair_events.length, report_units: records.report_map.report_units.length, ...(manifest.archive_schema_version === '2.0.0' ? { run_quality_evaluations: 1, lessons: records.lessons.length, policy_snapshots: 1 } : {}) };
}

export async function finalizeResearchRun(directory) {
  const runDirectory = path.resolve(directory);
  const manifest = await readJson(path.join(runDirectory, 'manifest.json'));
  const records = {
    plan: await readJson(path.join(runDirectory, 'plan.json')),
    conflicts: await readJson(path.join(runDirectory, 'conflicts.json')),
    coverage_gaps: await readJson(path.join(runDirectory, 'coverage-gaps.json')),
    semantic_validation: await readJson(path.join(runDirectory, 'semantic-validation.json')),
    report_map: await readJson(path.join(runDirectory, 'report-map.json')),
    sources: await readJsonl(path.join(runDirectory, 'sources.jsonl')),
    claims: await readJsonl(path.join(runDirectory, 'claims.jsonl')),
    discarded_claims: await readJsonl(path.join(runDirectory, 'discarded-claims.jsonl')),
    verification_events: await readJsonl(path.join(runDirectory, 'verification-events.jsonl')),
    repair_events: await readJsonl(path.join(runDirectory, 'repair-events.jsonl'))
  };
  if (manifest.archive_schema_version === '2.0.0') {
    records.run_quality_evaluation = await readJson(path.join(runDirectory, 'run-quality-evaluation.json'));
    records.policy_snapshot = await readJson(path.join(runDirectory, 'policy-snapshot.json'));
    records.lessons = await readJsonl(path.join(runDirectory, 'lessons.jsonl'));
  }
  const units = reportUnits(await readFile(path.join(runDirectory, 'report.md'), 'utf8'));
  for (const unit of records.report_map.report_units ?? []) if (units.has(unit.report_unit_id)) unit.text_sha256 = reportUnitSha256(units.get(unit.report_unit_id));
  manifest.paths = manifest.archive_schema_version === '2.0.0' ? PATHS : Object.fromEntries(Object.entries(PATHS).filter(([key]) => !['run_quality_evaluation', 'lessons', 'policy_snapshot'].includes(key)));
  manifest.counts = counts(records, manifest);
  const jsonFiles = manifest.archive_schema_version === '2.0.0' ? [...JSON_FILES, ...V2_JSON_FILES] : JSON_FILES;
  const jsonlFiles = manifest.archive_schema_version === '2.0.0' ? [...JSONL_FILES, ...V2_JSONL_FILES] : JSONL_FILES;
  for (const file of jsonFiles) await writeFile(path.join(runDirectory, file), json(records[file.replace('.json', '').replace(/-/g, '_')]));
  for (const file of jsonlFiles) await writeFile(path.join(runDirectory, file), records[file.replace('.jsonl', '').replace(/-/g, '_')].map((record) => JSON.stringify(canonical(record))).join('\n') + (records[file.replace('.jsonl', '').replace(/-/g, '_')].length ? '\n' : ''));
  await writeFile(path.join(runDirectory, 'manifest.json'), json(manifest));
  const structural = await validateResearchRun(runDirectory, { ignoreValidationStatus: true });
  await writeFile(path.join(runDirectory, 'validation.json'), json(structural));
  const result = await validateResearchRun(runDirectory);
  await writeFile(path.join(runDirectory, 'validation.json'), json(result));
  return result;
}
