import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readJsonl } from '../scripts/lib/jsonl.mjs';
import { reportUnitSha256, validateResearchRun } from '../scripts/lib/research-validation.mjs';
import { generateResearchContracts } from '../scripts/generate-research-contracts.mjs';

const fixtures = path.join(process.cwd(), 'tests', 'fixtures');
const fixture = (name) => path.join(fixtures, name);
const hasRule = (result, rule) => result.errors.some((error) => error.rule === rule);

async function readJson(file) { return JSON.parse(await readFile(file, 'utf8')); }
async function writeJson(file, value) { await writeFile(file, `${JSON.stringify(value, null, 2)}\n`); }

async function workflowNormalizer() {
  const workflow = await readFile(path.join(process.cwd(), '.claude', 'workflows', 'research-swarm.js'), 'utf8');
  const start = workflow.indexOf('const TRACKING_PARAMETERS');
  const end = workflow.indexOf('const normalizedSchema', start);
  return new Function(`${workflow.slice(start, end)}; return { normalizeVerificationEvents, normalizedUrl };`)();
}

async function copiedValid(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'research-validation-'));
  await cp(fixture('valid-run'), directory, { recursive: true });
  const manifestFile = path.join(directory, 'manifest.json');
  const manifest = await readJson(manifestFile);
  manifest.run_directory = directory;
  await writeJson(manifestFile, manifest);
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

async function markInvalid(directory) {
  await writeJson(path.join(directory, 'validation.json'), { valid: false });
}

async function mutateSource(t, mutate) {
  const directory = await copiedValid(t);
  const file = path.join(directory, 'sources.jsonl');
  const source = (await readJsonl(file)).records[0];
  mutate(source);
  await writeFile(file, `${JSON.stringify(source)}\n`);
  await markInvalid(directory);
  return validateResearchRun(directory);
}

async function mutateClaim(t, mutate) {
  const directory = await copiedValid(t);
  const file = path.join(directory, 'claims.jsonl');
  const claim = (await readJsonl(file)).records[0];
  mutate(claim);
  await writeFile(file, `${JSON.stringify(claim)}\n`);
  await markInvalid(directory);
  return validateResearchRun(directory);
}

async function mutateReport(t, mutate) {
  const directory = await copiedValid(t);
  await mutate(directory);
  await markInvalid(directory);
  return validateResearchRun(directory);
}

test('a valid run and definitive-primary sufficiency rationale pass', async () => {
  const result = await validateResearchRun(fixture('valid-run'));
  assert.equal(result.valid, true, JSON.stringify(result.errors));
});

test('a definitive primary authority with a sufficiency rationale passes', async () => {
  const source = (await readJsonl(path.join(fixture('valid-run'), 'sources.jsonl'))).records[0];
  const claim = (await readJsonl(path.join(fixture('valid-run'), 'claims.jsonl'))).records[0];
  assert.equal(source.source_type, 'primary_data');
  assert.match(claim.confidence_rationale, /sufficient/i);
  assert.equal((await validateResearchRun(fixture('valid-run'))).valid, true);
});

test('a missing source reference fails with the source rule', async () => {
  const result = await validateResearchRun(fixture('invalid-missing-source'));
  assert.equal(result.valid, false);
  assert.ok(hasRule(result, 'claim.evidence.source'));
});

test('an unknown report-map claim fails with the report-map rule', async () => {
  const result = await validateResearchRun(fixture('invalid-unknown-claim'));
  assert.equal(result.valid, false);
  assert.ok(hasRule(result, 'report_map.claim'));
});

test('a weak single-source high-confidence claim fails', async () => {
  const result = await validateResearchRun(fixture('invalid-confidence'));
  assert.equal(result.valid, false);
  assert.ok(hasRule(result, 'claim.confidence.high'));
});

test('an invalid source type fails its canonical schema', async (t) => {
  const result = await mutateSource(t, (source) => { source.source_type = 'blogish'; });
  assert.equal(result.valid, false);
  assert.ok(hasRule(result, 'schema.enum'));
});

test('an unexpected source property fails its canonical schema', async (t) => {
  const result = await mutateSource(t, (source) => { source.unexpected = true; });
  assert.equal(result.valid, false);
  assert.ok(hasRule(result, 'schema.additionalProperties'));
});

test('invalid date, date-time, URL, and DOI formats fail canonical schemas', async (t) => {
  for (const [field, value] of [['publication_date', '2026-02-30'], ['access_date', '2026/07/28'], ['url', 'not a URL'], ['doi', 'doi:bad']]) {
    const result = await mutateSource(t, (source) => { source[field] = value; });
    assert.equal(result.valid, false, field);
    assert.ok(hasRule(result, field === 'doi' ? 'schema.pattern' : 'schema.format'), field);
  }
  const directory = await copiedValid(t);
  const file = path.join(directory, 'verification-events.jsonl');
  const event = (await readJsonl(file)).records[0];
  event.occurred_at = '2026-07-28T25:00:00Z';
  await writeFile(file, `${JSON.stringify(event)}\n`);
  await markInvalid(directory);
  const result = await validateResearchRun(directory);
  assert.equal(result.valid, false);
  assert.ok(hasRule(result, 'schema.format'));
});

test('publication-date conditionals and claim conditional fields fail canonical schemas', async (t) => {
  const missingReason = await mutateSource(t, (source) => { source.publication_date = null; });
  assert.equal(missingReason.valid, false);
  assert.ok(hasRule(missingReason, 'schema.required'));
  const forbiddenReason = await mutateSource(t, (source) => { source.publication_date_unavailable_reason = 'not needed'; });
  assert.equal(forbiddenReason.valid, false);
  assert.ok(hasRule(forbiddenReason, 'schema.not'));
  const claim = await mutateClaim(t, (record) => { record.premise_claim_ids = ['clm_fixture']; });
  assert.equal(claim.valid, false);
  assert.ok(hasRule(claim, 'schema.not'));
});

test('generation rejects stale workflow contracts, missing references, and duplicate schema IDs', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'research-contracts-'));
  const schemas = path.join(directory, 'schemas');
  const workflow = path.join(directory, 'research-swarm.js');
  const registry = path.join(directory, 'research-contracts.generated.mjs');
  await cp(path.join(process.cwd(), 'research', 'schemas'), schemas, { recursive: true });
  await cp(path.join(process.cwd(), '.claude', 'workflows', 'research-swarm.js'), workflow);
  t.after(() => rm(directory, { recursive: true, force: true }));
  await generateResearchContracts({ schemaDirectory: schemas, workflowPath: workflow, registryPath: registry });
  await writeFile(workflow, (await readFile(workflow, 'utf8')).replace('const sourceSchema', 'const staleSourceSchema'));
  await assert.rejects(generateResearchContracts({ schemaDirectory: schemas, workflowPath: workflow, registryPath: registry, check: true }), /stale/);
  const claimFile = path.join(schemas, 'claim.schema.json');
  const claimSchema = await readJson(claimFile);
  claimSchema.$defs.evidence.properties.source_id.$ref = 'missing.schema.json#/$defs/sourceId';
  await writeJson(claimFile, claimSchema);
  await assert.rejects(generateResearchContracts({ schemaDirectory: schemas, workflowPath: workflow, registryPath: registry }), /Missing schema reference/);
  claimSchema.$defs.evidence.properties.source_id.$ref = 'source.schema.json#/$defs/sourceId';
  await writeJson(claimFile, claimSchema);
  const sourceFile = path.join(schemas, 'source.schema.json');
  const sourceSchema = await readJson(sourceFile);
  sourceSchema.$id = claimSchema.$id;
  await writeJson(sourceFile, sourceSchema);
  await assert.rejects(generateResearchContracts({ schemaDirectory: schemas, workflowPath: workflow, registryPath: registry }), /Duplicate schema ID/);
});

test('duplicate IDs fail', async (t) => {
  const directory = await copiedValid(t);
  const sources = await readFile(path.join(directory, 'sources.jsonl'), 'utf8');
  await writeFile(path.join(directory, 'sources.jsonl'), `${sources}${sources}`);
  const manifest = await readJson(path.join(directory, 'manifest.json'));
  manifest.counts.sources = 2;
  await writeJson(path.join(directory, 'manifest.json'), manifest);
  await markInvalid(directory);
  const result = await validateResearchRun(directory);
  assert.equal(result.valid, false);
  assert.ok(hasRule(result, 'source_id.unique'));
});

test('noncanonical record IDs fail', async (t) => {
  const directory = await copiedValid(t);
  const sourcesFile = path.join(directory, 'sources.jsonl');
  const source = (await readJsonl(sourcesFile)).records[0];
  source.source_id = 'source_bad';
  await writeFile(sourcesFile, `${JSON.stringify(source)}\n`);
  await markInvalid(directory);
  const result = await validateResearchRun(directory);
  assert.equal(result.valid, false);
  assert.ok(hasRule(result, 'source_id.format'));
});

test('malformed JSONL fails', async (t) => {
  const directory = await copiedValid(t);
  await writeFile(path.join(directory, 'sources.jsonl'), '{not json}\n');
  await markInvalid(directory);
  const result = await validateResearchRun(directory);
  assert.equal(result.valid, false);
  assert.ok(hasRule(result, 'jsonl.parse'));
});

test('unverifiable remains distinct from contradicted', async (t) => {
  const directory = await copiedValid(t);
  const eventsFile = path.join(directory, 'verification-events.jsonl');
  const original = await readJsonl(eventsFile);
  assert.equal(original.records[0].outcome, 'unverifiable');
  original.records[0].outcome = 'contradicted';
  await writeFile(eventsFile, `${JSON.stringify(original.records[0])}\n`);
  const contradicted = await readJsonl(eventsFile);
  assert.equal(contradicted.records[0].outcome, 'contradicted');
  assert.equal((await validateResearchRun(directory)).valid, true);
});

test('an unresolved high-materiality conflict omitted from the map fails', async (t) => {
  const directory = await copiedValid(t);
  const claimsFile = path.join(directory, 'claims.jsonl');
  const claims = await readJsonl(claimsFile);
  claims.records.push({ ...claims.records[0], claim_id: 'clm_other', statement: 'A competing fixture fact.' });
  await writeFile(claimsFile, `${claims.records.map(JSON.stringify).join('\n')}\n`);
  await writeJson(path.join(directory, 'conflicts.json'), [{ conflict_id: 'conf_fixture', claim_ids: ['clm_fixture', 'clm_other'], supporting_source_ids: ['src_fixture'], reason: 'Different fixture interpretations.', practical_implication: 'Do not generalize.', status: 'unresolved' }]);
  await writeJson(path.join(directory, 'report-map.json'), { report_map_id: 'rmap_fixture', report_units: [] });
  const manifest = await readJson(path.join(directory, 'manifest.json'));
  manifest.counts.claims = 2;
  manifest.counts.retained_claims = 2;
  manifest.counts.conflicts = 1;
  manifest.counts.report_units = 0;
  await writeJson(path.join(directory, 'manifest.json'), manifest);
  await markInvalid(directory);
  const result = await validateResearchRun(directory);
  assert.equal(result.valid, false);
  assert.ok(hasRule(result, 'conflict.report_map'));
});

test('retained and discarded overlap fails', async (t) => {
  const directory = await copiedValid(t);
  const claim = (await readJsonl(path.join(directory, 'claims.jsonl'))).records[0];
  await writeFile(path.join(directory, 'discarded-claims.jsonl'), `${JSON.stringify(claim)}\n`);
  const manifest = await readJson(path.join(directory, 'manifest.json'));
  manifest.counts.discarded_claims = 1;
  await writeJson(path.join(directory, 'manifest.json'), manifest);
  await markInvalid(directory);
  const result = await validateResearchRun(directory);
  assert.equal(result.valid, false);
  assert.ok(hasRule(result, 'claim.retained_discarded'));
});

test('an inference without premise claims fails', async (t) => {
  const directory = await copiedValid(t);
  const claimsFile = path.join(directory, 'claims.jsonl');
  const claim = (await readJsonl(claimsFile)).records[0];
  claim.claim_type = 'inference';
  delete claim.premise_claim_ids;
  await writeFile(claimsFile, `${JSON.stringify(claim)}\n`);
  await markInvalid(directory);
  const result = await validateResearchRun(directory);
  assert.equal(result.valid, false);
  assert.ok(hasRule(result, 'claim.inference.premises'));
});

test('a manifest count mismatch fails', async (t) => {
  const directory = await copiedValid(t);
  const manifestFile = path.join(directory, 'manifest.json');
  const manifest = await readJson(manifestFile);
  manifest.counts.sources = 2;
  await writeJson(manifestFile, manifest);
  await markInvalid(directory);
  const result = await validateResearchRun(directory);
  assert.equal(result.valid, false);
  assert.ok(hasRule(result, 'manifest.counts'));
});

test('report anchors tie every mapped unit to exact prose', async (t) => {
  const cases = [
    ['missing start marker', async (directory) => writeFile(path.join(directory, 'report.md'), '# Fixture Report\n\nThe fixture authority published the record.\n<!-- report-unit:rpt_fixture:end -->\n'), 'report.anchor.order'],
    ['missing end marker', async (directory) => writeFile(path.join(directory, 'report.md'), '# Fixture Report\n\n<!-- report-unit:rpt_fixture:start -->\nThe fixture authority published the record.\n'), 'report.anchor.missing_end'],
    ['reversed markers', async (directory) => writeFile(path.join(directory, 'report.md'), '# Fixture Report\n\n<!-- report-unit:rpt_fixture:end -->\nThe fixture authority published the record.\n<!-- report-unit:rpt_fixture:start -->\n'), 'report.anchor.order'],
    ['nested markers', async (directory) => writeFile(path.join(directory, 'report.md'), '# Fixture Report\n\n<!-- report-unit:rpt_fixture:start -->\n<!-- report-unit:rpt_nested:start -->\nThe fixture authority published the record.\n<!-- report-unit:rpt_nested:end -->\n<!-- report-unit:rpt_fixture:end -->\n'), 'report.anchor.nested'],
    ['duplicate marker', async (directory) => writeFile(path.join(directory, 'report.md'), '# Fixture Report\n\n<!-- report-unit:rpt_fixture:start -->\n<!-- report-unit:rpt_fixture:start -->\nThe fixture authority published the record.\n<!-- report-unit:rpt_fixture:end -->\n'), 'report.anchor.duplicate'],
    ['unknown marker', async (directory) => writeFile(path.join(directory, 'report.md'), '# Fixture Report\n\n<!-- report-unit:unknown:start -->\nThe fixture authority published the record.\n<!-- report-unit:rpt_fixture:end -->\n'), 'report.anchor.unknown'],
    ['stale hash', async (directory) => writeFile(path.join(directory, 'report.md'), '# Fixture Report\n\n<!-- report-unit:rpt_fixture:start -->\nThe edited fixture authority published the record.\n<!-- report-unit:rpt_fixture:end -->\n'), 'report_map.text_sha256'],
    ['empty unit', async (directory) => writeFile(path.join(directory, 'report.md'), '# Fixture Report\n\n<!-- report-unit:rpt_fixture:start -->\n\n<!-- report-unit:rpt_fixture:end -->\n'), 'report.anchor.empty']
  ];
  for (const [name, mutate, rule] of cases) {
    const result = await mutateReport(t, mutate);
    assert.equal(result.valid, false, name);
    assert.ok(hasRule(result, rule), name);
  }
});

test('report map coverage, normalization, and ledger links are enforced', async (t) => {
  const mapWithoutProse = await mutateReport(t, async (directory) => {
    const map = await readJson(path.join(directory, 'report-map.json'));
    map.report_units.push({ report_unit_id: 'rpt_orphan', section: 'Key Findings', claim_ids: ['clm_fixture'], text_sha256: '0'.repeat(64) });
    await writeJson(path.join(directory, 'report-map.json'), map);
    const manifest = await readJson(path.join(directory, 'manifest.json')); manifest.counts.report_units = 2; await writeJson(path.join(directory, 'manifest.json'), manifest);
  });
  assert.ok(hasRule(mapWithoutProse, 'report_map.anchor'));

  const proseWithoutMap = await mutateReport(t, async (directory) => {
    await writeJson(path.join(directory, 'report-map.json'), { report_map_id: 'rmap_fixture', report_units: [] });
    const manifest = await readJson(path.join(directory, 'manifest.json')); manifest.counts.report_units = 0; await writeJson(path.join(directory, 'manifest.json'), manifest);
  });
  assert.ok(hasRule(proseWithoutMap, 'report.anchor.map'));

  const crlf = await copiedValid(t);
  await writeFile(path.join(crlf, 'report.md'), (await readFile(path.join(crlf, 'report.md'), 'utf8')).replace(/\n/g, '\r\n'));
  assert.equal((await validateResearchRun(crlf)).valid, true);

  const codeFence = await copiedValid(t);
  await writeFile(path.join(codeFence, 'report.md'), `${await readFile(path.join(codeFence, 'report.md'), 'utf8')}\n\`\`\`md\n<!-- report-unit:rpt_literal:start -->\nliteral example\n<!-- report-unit:rpt_literal:end -->\n\`\`\`\n`);
  assert.equal((await validateResearchRun(codeFence)).valid, true);

  const inference = await mutateReport(t, async (directory) => {
    const map = await readJson(path.join(directory, 'report-map.json')); map.report_units[0].is_inference = true; await writeJson(path.join(directory, 'report-map.json'), map);
  });
  assert.ok(hasRule(inference, 'report_map.inference'));

  const discarded = await mutateReport(t, async (directory) => {
    const claim = (await readJsonl(path.join(directory, 'claims.jsonl'))).records[0];
    await writeFile(path.join(directory, 'discarded-claims.jsonl'), `${JSON.stringify({ ...claim, claim_id: 'clm_discarded', discard_reason: 'Fixture discard.', discard_basis: 'duplicate' })}\n`);
    const map = await readJson(path.join(directory, 'report-map.json')); map.report_units[0].claim_ids = ['clm_discarded']; await writeJson(path.join(directory, 'report-map.json'), map);
    const manifest = await readJson(path.join(directory, 'manifest.json')); manifest.counts.discarded_claims = 1; await writeJson(path.join(directory, 'manifest.json'), manifest);
  });
  assert.ok(hasRule(discarded, 'report_map.claim'));
  assert.equal(reportUnitSha256('The fixture authority published the record.'), '9b8f63de317499e05ed03edab16517e6847a4937d06b59c1783ceac5f481dbe7');
});

test('verification events may reference retained or discarded claims, but not unknown claims', async (t) => {
  const directory = await copiedValid(t);
  const claim = (await readJsonl(path.join(directory, 'claims.jsonl'))).records[0];
  const discarded = { ...claim, claim_id: 'clm_discarded', discard_reason: 'Verification contradicted the claim.', discard_basis: 'verification', verification_event_ids: ['ver_discarded'] };
  const event = { verification_event_id: 'ver_discarded', claim_id: 'clm_discarded', occurred_at: '2026-07-28T00:00:00Z', outcome: 'contradicted', rationale: 'Fixture counter-evidence.', checked_source_ids: ['src_fixture'] };
  await writeFile(path.join(directory, 'discarded-claims.jsonl'), `${JSON.stringify(discarded)}\n`);
  await writeFile(path.join(directory, 'verification-events.jsonl'), `${(await readJsonl(path.join(directory, 'verification-events.jsonl'))).records.map(JSON.stringify).join('\n')}\n${JSON.stringify(event)}\n`);
  const manifest = await readJson(path.join(directory, 'manifest.json'));
  manifest.counts.discarded_claims = 1; manifest.counts.verification_events = 2;
  await writeJson(path.join(directory, 'manifest.json'), manifest);
  assert.equal((await validateResearchRun(directory)).valid, true);
  event.claim_id = 'clm_unknown';
  await writeFile(path.join(directory, 'verification-events.jsonl'), `${(await readJsonl(path.join(directory, 'verification-events.jsonl'))).records.slice(0, 1).map(JSON.stringify).join('\n')}\n${JSON.stringify(event)}\n`);
  await markInvalid(directory);
  assert.ok(hasRule(await validateResearchRun(directory), 'verification.claim'));
});

test('discard bases enforce only verification-linked event IDs', async (t) => {
  const directory = await copiedValid(t);
  const claim = (await readJsonl(path.join(directory, 'claims.jsonl'))).records[0];
  const discarded = { ...claim, claim_id: 'clm_discarded', discard_reason: 'No provenance.', discard_basis: 'provenance' };
  await writeFile(path.join(directory, 'discarded-claims.jsonl'), `${JSON.stringify(discarded)}\n`);
  const manifest = await readJson(path.join(directory, 'manifest.json'));
  manifest.counts.discarded_claims = 1;
  await writeJson(path.join(directory, 'manifest.json'), manifest);
  assert.equal((await validateResearchRun(directory)).valid, true);
  discarded.discard_basis = 'verification';
  await writeFile(path.join(directory, 'discarded-claims.jsonl'), `${JSON.stringify(discarded)}\n`);
  await markInvalid(directory);
  assert.equal((await validateResearchRun(directory)).valid, false);
});

test('conflicts and coverage gaps retain ledger references and final dispositions', async (t) => {
  const directory = await copiedValid(t);
  const claim = (await readJsonl(path.join(directory, 'claims.jsonl'))).records[0];
  const discarded = { ...claim, claim_id: 'clm_discarded', discard_reason: 'Duplicate wording.', discard_basis: 'duplicate' };
  await writeFile(path.join(directory, 'discarded-claims.jsonl'), `${JSON.stringify(discarded)}\n`);
  await writeJson(path.join(directory, 'conflicts.json'), [{ conflict_id: 'conf_fixture', claim_ids: ['clm_fixture', 'clm_discarded'], supporting_source_ids: ['src_fixture'], reason: 'Fixture disagreement.', practical_implication: 'Qualify the conclusion.', status: 'qualified' }]);
  await writeJson(path.join(directory, 'coverage-gaps.json'), [{ coverage_gap_id: 'gap_fixture', description: 'No secondary fixture source.', severity: 'medium', status: 'accepted', related_subquestion_ids: ['sq_fixture'], related_claim_ids: ['clm_discarded'] }]);
  const manifest = await readJson(path.join(directory, 'manifest.json'));
  manifest.counts.discarded_claims = 1; manifest.counts.conflicts = 1; manifest.counts.coverage_gaps = 1;
  await writeJson(path.join(directory, 'manifest.json'), manifest);
  assert.equal((await validateResearchRun(directory)).valid, true);
  const conflict = await readJson(path.join(directory, 'conflicts.json')); conflict[0].claim_ids[1] = 'clm_unknown';
  await writeJson(path.join(directory, 'conflicts.json'), conflict); await markInvalid(directory);
  assert.ok(hasRule(await validateResearchRun(directory), 'conflict.claim'));
});

test('new archive artifacts, their schemas, and manifest counts are required', async (t) => {
  const directory = await copiedValid(t);
  await rm(path.join(directory, 'semantic-validation.json'));
  await markInvalid(directory);
  assert.equal((await validateResearchRun(directory)).valid, false);
  const directory2 = await copiedValid(t);
  await writeFile(path.join(directory2, 'repair-events.jsonl'), '{bad}\n'); await markInvalid(directory2);
  assert.ok(hasRule(await validateResearchRun(directory2), 'jsonl.parse'));
  const directory3 = await copiedValid(t);
  const manifest = await readJson(path.join(directory3, 'manifest.json'));
  for (const key of ['coverage_gaps', 'semantic_validations', 'repair_events']) { manifest.counts[key] += 1; await writeJson(path.join(directory3, 'manifest.json'), manifest); await markInvalid(directory3); assert.ok(hasRule(await validateResearchRun(directory3), 'manifest.counts'), key); manifest.counts[key] -= 1; }
  const directory4 = await copiedValid(t);
  await writeJson(path.join(directory4, 'coverage-gaps.json'), [{ coverage_gap_id: 'gap_fixture', description: 'A resolved fixture gap.', severity: 'low', status: 'resolved', related_subquestion_ids: ['sq_fixture'] }]);
  const manifest4 = await readJson(path.join(directory4, 'manifest.json')); manifest4.counts.coverage_gaps = 1;
  await writeJson(path.join(directory4, 'manifest.json'), manifest4); await markInvalid(directory4);
  assert.equal((await validateResearchRun(directory4)).valid, false);
});

test('repair events enforce the shared two-round budget and complete audit fields', async (t) => {
  const directory = await copiedValid(t);
  const event = { repair_event_id: 'rep_fixture', occurred_at: '2026-07-29T00:00:00Z', repair_round: 1, action_type: 'report_repair', trigger_ids: ['def_fixture'], target_claim_ids: ['clm_fixture'], target_report_unit_ids: ['rpt_fixture'], agent_count: 1, action_summary: 'Removed unsupported fixture prose.', outcome: 'completed' };
  await writeFile(path.join(directory, 'repair-events.jsonl'), `${JSON.stringify(event)}\n`);
  const manifest = await readJson(path.join(directory, 'manifest.json')); manifest.counts.repair_events = 1; await writeJson(path.join(directory, 'manifest.json'), manifest);
  assert.equal((await validateResearchRun(directory)).valid, true);
  await writeFile(path.join(directory, 'repair-events.jsonl'), `${[event, { ...event, repair_event_id: 'rep_two', repair_round: 2 }, { ...event, repair_event_id: 'rep_three', repair_round: 3 }].map(JSON.stringify).join('\n')}\n`);
  manifest.counts.repair_events = 3; await writeJson(path.join(directory, 'manifest.json'), manifest); await markInvalid(directory);
  assert.ok(hasRule(await validateResearchRun(directory), 'repair_events.budget'));
});

test('verification normalization deduplicates DOI and URL sources, preserves events, and records counter-evidence', async () => {
  const { normalizeVerificationEvents, normalizedUrl } = await workflowNormalizer();
  const source = (await readJsonl(path.join(fixture('valid-run'), 'sources.jsonl'))).records[0];
  const claim = (await readJsonl(path.join(fixture('valid-run'), 'claims.jsonl'))).records[0];
  source.doi = '10.1234/FIXTURE'; source.url = 'https://fixture-authority.invalid/record?utm_source=test#section';
  const event = {
    verification_event_id: 'ver_new', claim_id: claim.claim_id, occurred_at: '2026-07-28T00:00:00Z', outcome: 'contradicted', rationale: 'An independent check found a material limitation.', checked_source_ids: [source.source_id], proposed_conflict: 'The verifier found directly contradictory evidence.',
    new_sources: [{ ...source, source_id: 'tmp_src_same', doi: 'https://doi.org/10.1234/fixture', url: 'https://fixture-authority.invalid/record?utm_medium=email#other' }],
    new_evidence: [{ source_id: 'tmp_src_same', locator: 'Limitations', relationship: 'contradicts', note: 'The result is narrower than stated.' }]
  };
  const output = normalizeVerificationEvents([source], [claim], [], [event]);
  assert.equal(output.sources.length, 1);
  assert.equal(output.verification_events[0], event);
  assert.equal(output.claims[0].counter_evidence[0].source_id, source.source_id);
  assert.equal(output.conflicts[0].claim_ids[0], claim.claim_id);
  assert.equal(normalizedUrl('https://example.test/a?keep=yes&utm_campaign=x#fragment'), 'https://example.test/a?keep=yes');
});

test('verification normalization rejects missing local evidence and does not merge title-only sources', async () => {
  const { normalizeVerificationEvents } = await workflowNormalizer();
  const source = (await readJsonl(path.join(fixture('valid-run'), 'sources.jsonl'))).records[0];
  const claim = (await readJsonl(path.join(fixture('valid-run'), 'claims.jsonl'))).records[0];
  const base = { verification_event_id: 'ver_local', claim_id: claim.claim_id, occurred_at: '2026-07-28T00:00:00Z', outcome: 'confirmed', rationale: 'Checked.', checked_source_ids: [source.source_id] };
  assert.throws(() => normalizeVerificationEvents([source], [claim], [], [{ ...base, new_evidence: [{ source_id: 'tmp_src_missing', locator: 'Page 1', relationship: 'supports' }] }]), /missing new source/);
  const output = normalizeVerificationEvents([source], [claim], [], [{ ...base, new_sources: [{ ...source, source_id: 'tmp_src_different', publisher: 'Different Publisher', doi: undefined, url: 'https://different.invalid/record' }], new_evidence: [{ source_id: 'tmp_src_different', locator: 'Page 1', relationship: 'supports' }] }]);
  assert.equal(output.sources.length, 2);
  assert.match(output.sources[1].source_id, /^src_ver_/);
});
