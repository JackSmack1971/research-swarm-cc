import { readFile } from 'node:fs/promises';
import { compileContextCapsules, compileTaskGraph, renderContextCapsule } from './lib/task-graph.mjs';

try {
  if (process.argv.length !== 5) throw new Error('Usage: node scripts/compile-task-graph.mjs <contract.json> <task-drafts.json> <target-directory>');
  const contract = JSON.parse(await readFile(process.argv[2], 'utf8')); const drafts = JSON.parse(await readFile(process.argv[3], 'utf8'));
  const graph = await compileTaskGraph({ graph_id: drafts.graph_id, contract, targetPath: process.argv[4], tasks: drafts.tasks }); const capsules = await compileContextCapsules(graph, contract, process.argv[4]);
  process.stdout.write(`${JSON.stringify({ graph, capsules, rendered_capsules: capsules.map(renderContextCapsule) }, null, 2)}\n`);
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
