// Smoke-drives the research-swarm-cc Node CLI layer end to end, isolated from
// real project state via RESEARCH_LEARNING_ROOT. Usage: node driver.mjs [step]
// Steps: contracts, validate, hook, doctor, learning, replay, all (default)
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const sandbox = mkdtempSync(path.join(os.tmpdir(), 'research-swarm-driver-'));
const learningEnv = { ...process.env, RESEARCH_LEARNING_ROOT: path.join(sandbox, 'research-learning') };

let failures = 0;

function run(label, args, { env = process.env, expectExit = 0 } = {}) {
  const result = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8' });
  const ok = result.status === expectExit;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label} (exit ${result.status}, expected ${expectExit})`);
  const out = (result.stdout || '').trim();
  if (out) console.log('  ' + out.slice(0, 400));
  if (result.stderr && result.stderr.trim()) console.log('  stderr: ' + result.stderr.trim().slice(0, 400));
  return result;
}

function step(name, fn) {
  console.log(`\n=== ${name} ===`);
  fn();
}

const steps = {
  contracts() {
    run('contracts:check', ['scripts/generate-research-contracts.mjs', '--check']);
  },
  validate() {
    run('validate-research-run valid-run', ['scripts/validate-research-run.mjs', 'tests/fixtures/valid-run']);
    run('validate-research-run invalid-confidence (expect exit 1)', ['scripts/validate-research-run.mjs', 'tests/fixtures/invalid-confidence'], { expectExit: 1 });
  },
  hook() {
    run('hook-smoke-test stop.json', ['scripts/hook-smoke-test.mjs', 'tests/fixtures/research-learning-hook/stop.json']);
    run('doctor-research-learning-hooks', ['scripts/doctor-research-learning-hooks.mjs', '.claude/settings.json']);
  },
  learning() {
    run('learning-control status (fresh sandbox)', ['scripts/research-learning-control.mjs', 'status'], { env: learningEnv });
    run('learning-control rebuild', ['scripts/research-learning-control.mjs', 'rebuild'], { env: learningEnv });
    run('register-research-learning valid-run-v2', ['scripts/register-research-learning.mjs', 'tests/fixtures/valid-run-v2'], { env: learningEnv });
    run('advance-research-learning', ['scripts/advance-research-learning.mjs'], { env: learningEnv });
    run('learning-control pause', ['scripts/research-learning-control.mjs', 'pause'], { env: learningEnv });
    run('learning-control resume', ['scripts/research-learning-control.mjs', 'resume'], { env: learningEnv });
  },
  replay() {
    run('replay-research-policy fixture', ['scripts/replay-research-policy.mjs', 'tests/fixtures/replay-policy/post-retrieval-candidate.json']);
  }
};

const requested = process.argv[2] || 'all';
if (requested === 'all') {
  for (const name of Object.keys(steps)) step(name, steps[name]);
} else if (steps[requested]) {
  step(requested, steps[requested]);
} else {
  console.error(`Unknown step "${requested}". Valid: ${Object.keys(steps).join(', ')}, all`);
  process.exitCode = 2;
}

rmSync(sandbox, { recursive: true, force: true });

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} STEP(S) FAILED`}`);
process.exitCode = failures === 0 ? 0 : 1;
