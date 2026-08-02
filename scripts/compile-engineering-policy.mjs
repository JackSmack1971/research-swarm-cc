#!/usr/bin/env node
import { engineeringLearningRoot, compileEngineeringPolicy, readState } from './lib/engineering-learning.mjs';
console.log(JSON.stringify(compileEngineeringPolicy(await readState(engineeringLearningRoot()), process.argv.slice(2).join(' '))));
