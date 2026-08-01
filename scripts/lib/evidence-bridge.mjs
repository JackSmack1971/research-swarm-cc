import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../../engineering/schemas/evidence-packet.schema.json' with { type: 'json' };
import { readJsonl } from './jsonl.mjs';
import { validateResearchRun } from './research-validation.mjs';

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const required = (value) => typeof value === 'string' && value.trim() !== '';
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
const validate = ajv.compile(schema);

export function validateEvidencePacket(packet) {
  if (!validate(packet)) return { valid: false, errors: validate.errors };
  const errors = [];
  const ids = new Set(packet.claims.map(({ claim_id }) => claim_id));
  if (ids.size !== packet.claims.length || packet.scope.selected_claim_ids.length !== ids.size || packet.scope.selected_claim_ids.some((id) => !ids.has(id))) errors.push('scope.selected_claim_ids must exactly match packet claims.');
  const sourceIds = new Set(packet.sources.map(({ source_id }) => source_id));
  for (const claim of packet.claims) for (const evidence of [...claim.supporting_evidence, ...claim.counter_evidence]) if (!sourceIds.has(evidence.source_id)) errors.push(`Claim ${claim.claim_id} references a source absent from packet.`);
  for (const conflict of packet.conflicts) for (const sourceId of conflict.supporting_source_ids) if (!sourceIds.has(sourceId)) errors.push(`Conflict ${conflict.conflict_id} references a source absent from packet.`);
  return { valid: errors.length === 0, errors };
}

async function archiveSha256(directory, manifest) {
  const files = ['manifest.json', ...Object.values(manifest.paths)].sort();
  const hash = createHash('sha256');
  for (const file of files) { hash.update(`${file}\0`); hash.update(await readFile(path.join(directory, file))); hash.update('\0'); }
  return hash.digest('hex');
}

export async function compileEvidencePacket({ archiveDirectory, packet_id, engineering_question, selection_rationale, claim_ids }) {
  if (!required(packet_id) || !required(engineering_question) || !required(selection_rationale) || !Array.isArray(claim_ids) || !claim_ids.length || new Set(claim_ids).size !== claim_ids.length) throw new Error('packet_id, engineering_question, selection_rationale, and unique claim_ids are required.');
  const directory = path.resolve(archiveDirectory ?? '');
  const archive = await validateResearchRun(directory);
  if (!archive.valid) throw new Error(`Research archive is not valid: ${archive.errors.map(({ rule }) => rule).join(', ')}`);
  const [manifest, semantic, claims, sources, events, conflicts, gaps] = await Promise.all([
    readJson(path.join(directory, 'manifest.json')), readJson(path.join(directory, 'semantic-validation.json')),
    readJsonl(path.join(directory, 'claims.jsonl')).then(({ records }) => records), readJsonl(path.join(directory, 'sources.jsonl')).then(({ records }) => records),
    readJsonl(path.join(directory, 'verification-events.jsonl')).then(({ records }) => records), readJson(path.join(directory, 'conflicts.json')), readJson(path.join(directory, 'coverage-gaps.json')),
  ]);
  if (semantic.status !== 'pass') throw new Error('Research archive did not pass semantic validation.');
  const retained = new Map(claims.map((claim) => [claim.claim_id, claim]));
  for (const id of claim_ids) if (!retained.has(id)) throw new Error(`Selected claim ${id} is not a retained canonical claim.`);
  const selected = claim_ids.map((id) => retained.get(id));
  const selectedSet = new Set(claim_ids);
  for (const claim of selected) {
    const outcomes = events.filter((event) => event.claim_id === claim.claim_id).map((event) => event.outcome);
    if (!outcomes.includes('confirmed') && !outcomes.includes('confirmed_with_qualification')) throw new Error(`Selected claim ${claim.claim_id} has no confirming verification event.`);
    if (outcomes.some((outcome) => ['contradicted', 'demoted', 'discarded'].includes(outcome))) throw new Error(`Selected claim ${claim.claim_id} has an adverse verification event.`);
  }
  const relevantConflicts = conflicts.filter((conflict) => conflict.claim_ids.some((id) => selectedSet.has(id)));
  const relevantGaps = gaps.filter((gap) => gap.related_claim_ids?.some((id) => selectedSet.has(id)));
  const requiredSourceIds = new Set(selected.flatMap((claim) => [...claim.supporting_evidence, ...claim.counter_evidence].map(({ source_id }) => source_id)));
  for (const conflict of relevantConflicts) for (const sourceId of conflict.supporting_source_ids) requiredSourceIds.add(sourceId);
  const sourceById = new Map(sources.map((source) => [source.source_id, source]));
  const packet = {
    schema_version: '1.0.0', packet_id,
    research_run: { run_id: manifest.run_id, plan_id: manifest.plan_id, archive_schema_version: manifest.archive_schema_version, archive_sha256: await archiveSha256(directory, manifest) },
    scope: { engineering_question, selection_rationale, selected_claim_ids: [...claim_ids] },
    claims: selected.map((claim) => ({ ...claim, verification_event_ids: events.filter((event) => event.claim_id === claim.claim_id).map(({ verification_event_id }) => verification_event_id) })),
    sources: [...requiredSourceIds].sort().map((id) => {
      const source = sourceById.get(id); if (!source) throw new Error(`Selected evidence references missing source ${id}.`);
      const { source_id, title, publisher, publication_date, source_type, independence_group } = source; return { source_id, title, publisher, publication_date, source_type, independence_group };
    }),
    conflicts: relevantConflicts,
    coverage_gaps: relevantGaps,
  };
  const result = validateEvidencePacket(packet);
  if (!result.valid) throw new Error(`Evidence packet validation failed: ${JSON.stringify(result.errors)}`);
  return packet;
}
