import { execFile as execute } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../../engineering/schemas/prototype-experiment.schema.json' with { type: 'json' };
import { profileProject } from './project-profiler.mjs';

const execFile = promisify(execute);
const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addFormat('date-time', { type: 'string', validate: (value) => !Number.isNaN(Date.parse(value)) });
const validate = ajv.compile(schema);
const git = (root, args) => execFile('git', ['-C', root, ...args], { windowsHide: true }).then(({ stdout }) => stdout.trim());
const absent = async (location) => access(location).then(() => false).catch(() => true);

export function validatePrototypeExperiment(experiment) {
  if (!validate(experiment)) return { valid: false, errors: validate.errors };
  const errors = [];
  const ids = (items, key, label) => { if (new Set(items.map((item) => item[key])).size !== items.length) errors.push(`Duplicate ${label} ID.`); };
  ids(experiment.variants, 'variant_id', 'variant'); ids(experiment.observations, 'observation_id', 'observation');
  if (!path.isAbsolute(experiment.isolation.location) || path.resolve(experiment.isolation.location) === path.parse(path.resolve(experiment.isolation.location)).root) errors.push('Prototype isolation location must be one explicit non-root absolute path.');
  if (experiment.verdict !== 'inconclusive' && (!experiment.observations.length || !experiment.decision_references.length)) errors.push('A conclusive prototype requires observations and resulting decision references.');
  return { valid: errors.length === 0, errors };
}

export async function detectPrototypeSourceDrift(experiment, repositoryRoot) {
  const checked = validatePrototypeExperiment(experiment); if (!checked.valid) throw new Error(`Prototype experiment validation failed: ${JSON.stringify(checked.errors)}`);
  const current = await profileProject(repositoryRoot);
  const base = experiment.base_revision;
  return { drifted: base.git_revision !== current.target.git_revision || base.source_fingerprint !== current.target.source_fingerprint, expected: base, current: current.target };
}

export function assertNoPrototypePromotion(experiment, candidatePaths) {
  const checked = validatePrototypeExperiment(experiment); if (!checked.valid) throw new Error(`Prototype experiment validation failed: ${JSON.stringify(checked.errors)}`);
  if (!Array.isArray(candidatePaths) || candidatePaths.some((item) => typeof item !== 'string')) throw new Error('Candidate production paths must be a string array.');
  const isolated = path.resolve(experiment.isolation.location);
  if (candidatePaths.some((item) => path.resolve(item) === isolated || path.resolve(item).startsWith(`${isolated}${path.sep}`))) throw new Error('Prototype artifacts cannot be promoted directly; create authorized production work from the resulting decision.');
}

export async function createPrototypeWorktree(experiment, repositoryRoot) {
  const drift = await detectPrototypeSourceDrift(experiment, repositoryRoot); if (drift.drifted) throw new Error(`Prototype base revision drift detected: ${JSON.stringify(drift)}`);
  const root = path.resolve(repositoryRoot); const location = path.resolve(experiment.isolation.location);
  if (!path.relative(root, location).startsWith('..')) throw new Error('Prototype isolation location must be outside the production repository.');
  if (!(await absent(location))) throw new Error('Prototype isolation location already exists.');
  if ((await git(root, ['rev-parse', experiment.base_revision.git_revision])) !== experiment.base_revision.git_revision) throw new Error('Prototype base revision is not available exactly as recorded.');
  await git(root, ['worktree', 'add', '--detach', location, experiment.base_revision.git_revision]);
  return location;
}

export async function disposePrototypeWorktree(experiment, repositoryRoot, now = () => new Date().toISOString()) {
  const checked = validatePrototypeExperiment(experiment); if (!checked.valid) throw new Error(`Prototype experiment validation failed: ${JSON.stringify(checked.errors)}`);
  await git(repositoryRoot, ['worktree', 'remove', experiment.isolation.location]);
  return { ...experiment, cleanup: { state: 'disposed', disposed_at: now() } };
}
