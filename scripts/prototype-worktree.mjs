import { readFile, writeFile } from 'node:fs/promises';
import { createPrototypeWorktree, disposePrototypeWorktree, validatePrototypeExperiment } from './lib/prototype-lane.mjs';

try {
  if (process.argv.length !== 5 || !['create', 'cleanup'].includes(process.argv[2])) throw new Error('Usage: node scripts/prototype-worktree.mjs <create|cleanup> <experiment.json> <repository-root>');
  const [action, file, repositoryRoot] = process.argv.slice(2); const experiment = JSON.parse(await readFile(file, 'utf8'));
  const checked = validatePrototypeExperiment(experiment); if (!checked.valid) throw new Error(`Prototype experiment validation failed: ${JSON.stringify(checked.errors)}`);
  if (action === 'create') process.stdout.write(`${await createPrototypeWorktree(experiment, repositoryRoot)}\n`);
  else { const disposed = await disposePrototypeWorktree(experiment, repositoryRoot); await writeFile(file, `${JSON.stringify(disposed, null, 2)}\n`); process.stdout.write(`${disposed.cleanup.state}\n`); }
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
