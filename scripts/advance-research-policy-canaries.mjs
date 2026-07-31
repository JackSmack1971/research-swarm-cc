import { readFile } from 'node:fs/promises';
import { advanceCandidates } from './lib/research-policy-canary.mjs';
import { learningRoot, readState, withLearningLock, writePolicy, writeState } from './lib/research-learning.mjs';

const file = process.argv[2];
if (!file) throw new Error('Usage: node scripts/advance-research-policy-canaries.mjs <outcomes.json>');
const outcomes = JSON.parse(await readFile(file, 'utf8'));
if (!Array.isArray(outcomes)) throw new Error('Canary outcomes must be an array.');
const root = learningRoot();
const result = await withLearningLock(root, async () => {
  const state = advanceCandidates(await readState(root), outcomes);
  await writeState(root, state);
  const policy = await writePolicy(root, state);
  return { advanced: true, candidates: state.candidates.map(({ improvement_candidate_id, status }) => ({ improvement_candidate_id, status })), policy_bundle_id: policy.policy_bundle_id };
});
console.log(JSON.stringify(result));
