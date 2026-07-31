import { learningRoot, readState, withLearningLock, writePolicy } from './lib/research-learning.mjs';
const query = process.argv.slice(2).join(' ');
const root = learningRoot();
const policy = await withLearningLock(root, async () => writePolicy(root, await readState(root), query));
console.log(JSON.stringify(policy));
