import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readJsonl } from '../scripts/lib/jsonl.mjs';
import { validateResearchRun } from '../scripts/lib/research-validation.mjs';
import { generateResearchContracts } from '../scripts/generate-research-contracts.mjs';

const fixtures = path.join(process.cwd(), 'tests', 'fixtures');
const fixture = (name) => path.join(fixtures, name);
const hasRule = (result, rule) => result.errors.some((error) => error.rule === rule);

async function readJson(file) { return JSON.parse(await readFile(file, 'utf8')); }
async function writeJson(file, value) { await writeFile(file, `${JSON.stringify(value, null, 2)}\n`); }

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
