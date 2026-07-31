import { advanceLessonLifecycle, learningRoot, readState, withLearningLock, writePolicy, writeState } from './lib/research-learning.mjs';

const root = learningRoot();
const result = await withLearningLock(root, async () => {
  const state = await readState(root);
  advanceLessonLifecycle(state);
  await writeState(root, state);
  const policy = await writePolicy(root, state);
  return { advanced: true, policy_bundle_id: policy.policy_bundle_id, active_lessons: state.active.length };
});
console.log(JSON.stringify(result));
