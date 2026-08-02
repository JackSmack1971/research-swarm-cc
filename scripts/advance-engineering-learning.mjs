#!/usr/bin/env node
import { engineeringLearningRoot, advanceEngineeringLearning, compileEngineeringPolicy, readState, withEngineeringLearningLock, writeState } from './lib/engineering-learning.mjs';
const root = engineeringLearningRoot();
const output = await withEngineeringLearningLock(root, async () => { const state = await readState(root); advanceEngineeringLearning(state); await writeState(root, state); return { activation: state.activation, provisional: state.provisional.length, review: state.review.length, active: state.active.length, rejected: state.rejected.length, policy: compileEngineeringPolicy(state) }; });
console.log(JSON.stringify(output));
