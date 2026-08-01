import { access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
export async function ensureResearchDependencies({ cwd = process.cwd(), importAjv = () => import('ajv'), execute = (command, args) => run(command, args, { cwd }) } = {}) {
  try { await importAjv(); return { action: 'noop' }; } catch { /* Install only when the required dependency is unavailable. */ }
  let locked = false; try { await access(new URL('package-lock.json', `file:///${cwd.replace(/\\/g, '/')}/`)); locked = true; } catch { /* No lockfile. */ }
  await execute('npm', [locked ? 'ci' : 'install', '--ignore-scripts', '--no-audit', '--no-fund']); return { action: locked ? 'ci' : 'install' };
}
if (process.argv[1]?.endsWith('ensure-research-dependencies.mjs')) await ensureResearchDependencies();
