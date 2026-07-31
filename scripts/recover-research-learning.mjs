import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { validateResearchRun } from './lib/research-validation.mjs';

const run = promisify(execFile);
const input = await new Promise((resolve) => { let body = ''; process.stdin.setEncoding('utf8'); process.stdin.on('data', (chunk) => { body += chunk; }); process.stdin.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve(null); } }); process.stdin.on('error', () => resolve(null)); });
if (!input || input.stop_hook_active || typeof process.env.CLAUDE_PROJECT_DIR !== 'string' || !process.env.CLAUDE_PROJECT_DIR.trim()) process.exit(0);

try {
  const project = path.resolve(process.env.CLAUDE_PROJECT_DIR);
  const runs = path.resolve(process.env.RESEARCH_RUN_ROOT || path.join(project, 'artifacts', 'research-runs'));
  const entries = await readdir(runs, { withFileTypes: true });
  for (const entry of entries.filter((item) => item.isDirectory()).sort((left, right) => left.name.localeCompare(right.name))) {
    const directory = path.join(runs, entry.name);
    const result = await validateResearchRun(directory);
    if (!result.valid) continue;
    await run(process.execPath, [path.join(project, 'scripts', 'register-research-learning.mjs'), directory], { cwd: project, env: { ...process.env, RESEARCH_LEARNING_ROOT: process.env.RESEARCH_LEARNING_ROOT || path.join(project, 'artifacts', 'research-learning') } });
  }
} catch {
  // Recovery is deliberately best-effort: a Stop hook must never block a normal response.
}
