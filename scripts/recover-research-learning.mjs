import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { readLearningManifest } from './lib/research-learning.mjs';

const run = promisify(execFile);
const readManifest = async (directory) => { try { return JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8')); } catch { return null; } };
export async function recoverResearchLearning({ project, runs = path.join(project, 'artifacts', 'research-runs'), root = path.join(project, 'artifacts', 'research-learning'), register = async (directory) => run(process.execPath, [path.join(project, 'scripts', 'register-research-learning.mjs'), directory], { cwd: project, env: { ...process.env, RESEARCH_LEARNING_ROOT: root } }) }) {
  const manifest = await readLearningManifest(root);
  if (manifest.paused) return { processed: 0 };
  const registered = new Set(manifest.registered_run_ids || []);
  let processed = 0;
  const entries = await readdir(runs, { withFileTypes: true });
  for (const entry of entries.filter((item) => item.isDirectory()).sort((left, right) => left.name.localeCompare(right.name))) {
    const directory = path.join(runs, entry.name);
    const runManifest = await readManifest(directory);
    if (runManifest?.archive_schema_version !== '2.0.0' || typeof runManifest.run_id !== 'string' || registered.has(runManifest.run_id)) continue;
    try { await register(directory); processed += 1; } catch { /* A bad candidate must not block later recovery. */ }
  }
  return { processed };
}
async function main() {
  const input = await new Promise((resolve) => { let body = ''; process.stdin.setEncoding('utf8'); process.stdin.on('data', (chunk) => { body += chunk; }); process.stdin.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve(null); } }); process.stdin.on('error', () => resolve(null)); });
  if (!input || input.stop_hook_active || typeof process.env.CLAUDE_PROJECT_DIR !== 'string' || !process.env.CLAUDE_PROJECT_DIR.trim()) return;
  try {
    const project = path.resolve(process.env.CLAUDE_PROJECT_DIR);
    await recoverResearchLearning({ project, runs: path.resolve(process.env.RESEARCH_RUN_ROOT || path.join(project, 'artifacts', 'research-runs')), root: path.resolve(process.env.RESEARCH_LEARNING_ROOT || path.join(project, 'artifacts', 'research-learning')) });
  } catch {
    // Recovery is deliberately best-effort: a Stop hook must never block a normal response.
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
