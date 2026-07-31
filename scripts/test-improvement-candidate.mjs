import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const stable = (value) => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value);
const run = (command, args, cwd) => new Promise((resolve) => execFile(command, args, { cwd, windowsHide: true }, (error, stdout, stderr) => resolve({ command: [command, ...args].join(' '), passed: !error, stdout, stderr })));
const read = async (file) => JSON.parse(await readFile(file, 'utf8'));
const required = ['manifest.json', 'evidence-summary.json', 'proposed.patch', 'target-files.json'];

export async function testImprovementCandidate(directory, { repositoryRoot = ROOT, learningStateRoot = path.join(repositoryRoot, 'artifacts', 'research-learning') } = {}) {
  const candidateDirectory = path.resolve(directory);
  if (!candidateDirectory.startsWith(`${path.resolve(learningStateRoot, 'candidates')}${path.sep}`)) throw new Error('Candidate must be under the ignored learning candidates directory.');
  for (const name of required) await readFile(path.join(candidateDirectory, name));
  const manifest = await read(path.join(candidateDirectory, 'manifest.json'));
  const targets = await read(path.join(candidateDirectory, 'target-files.json'));
  const patch = await readFile(path.join(candidateDirectory, 'proposed.patch'), 'utf8');
  const evidence = await read(path.join(candidateDirectory, 'evidence-summary.json'));
  const result = { tested_at: new Date().toISOString(), status: 'inconclusive', checks: [], reason: null };
  if (manifest.evidence_sha256 !== hash(stable(evidence)) || manifest.proposed_patch_sha256 !== hash(patch) || !evidence.active_lesson_ids?.length) { result.status = 'rejected'; result.reason = 'candidate evidence or patch changed after creation'; }
  for (const target of targets) {
    const current = await readFile(path.join(repositoryRoot, target.path)).then(hash).catch(() => null);
    if (current !== target.sha256) { result.status = 'rejected'; result.reason = `stale target file: ${target.path}`; }
  }
  const sandbox = await mkdtemp(path.join(os.tmpdir(), 'research-improvement-'));
  try {
    if (result.status !== 'rejected') {
      await cp(repositoryRoot, sandbox, { recursive: true, filter: (source) => !source.includes(`${path.sep}.git`) && !source.includes(`${path.sep}artifacts${path.sep}research-learning`) });
      const patchFile = path.join(sandbox, 'candidate.patch'); await writeFile(patchFile, patch);
      for (const entry of [['git', ['apply', '--check', '--unsafe-paths', patchFile]], ['git', ['apply', '--unsafe-paths', patchFile]], ['npm', ['run', 'contracts:check']], ['npm', ['test']], ['node', ['scripts/replay-research-policy.mjs', path.join('tests', 'fixtures', 'replay-policy', 'post-retrieval-candidate.json')]], ['node', ['--check', 'scripts/create-improvement-candidate.mjs']], ['node', ['--check', 'scripts/test-improvement-candidate.mjs']], ['git', ['diff', '--check', '--no-index', '--', sandbox, sandbox]]]) {
        const check = await run(entry[0], entry[1], sandbox); result.checks.push(check);
        if (!check.passed) { result.status = 'rejected'; result.reason = `failed: ${check.command}`; break; }
      }
      if (result.status === 'inconclusive') result.status = manifest.replay_canary_evidence?.replay && manifest.replay_canary_evidence?.canary ? 'ready' : 'inconclusive';
    }
  } catch (error) { result.status = 'inconclusive'; result.reason = `sandbox failure: ${error.message}`; }
  finally { await rm(sandbox, { recursive: true, force: true }); }
  manifest.status = result.status; await writeFile(path.join(candidateDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`); await writeFile(path.join(candidateDirectory, 'test-result.json'), `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Usage: node scripts/test-improvement-candidate.mjs <candidate-directory>');
  console.log(JSON.stringify(await testImprovementCandidate(process.argv[2])));
}
