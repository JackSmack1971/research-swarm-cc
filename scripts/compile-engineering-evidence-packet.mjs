import { compileEvidencePacket } from './lib/evidence-bridge.mjs';

try {
  if (process.argv.length !== 7) throw new Error('Usage: node scripts/compile-engineering-evidence-packet.mjs <archive-directory> <packet-id> <engineering-question> <selection-rationale> <claim-id[,claim-id...]>');
  const [archiveDirectory, packet_id, engineering_question, selection_rationale, ids] = process.argv.slice(2);
  process.stdout.write(`${JSON.stringify(await compileEvidencePacket({ archiveDirectory, packet_id, engineering_question, selection_rationale, claim_ids: ids.split(',').filter(Boolean) }), null, 2)}\n`);
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
