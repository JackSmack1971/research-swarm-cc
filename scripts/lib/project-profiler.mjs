import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { realpath, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../../engineering/schemas/project-profile.schema.json' with { type: 'json' };

const run = promisify(execFile);
const SKIP = new Set(['.git', 'node_modules', '.venv', 'coverage', 'dist', 'build']);
const LANGUAGE = { '.js': 'JavaScript', '.mjs': 'JavaScript', '.cjs': 'JavaScript', '.ts': 'TypeScript', '.tsx': 'TypeScript', '.jsx': 'JavaScript', '.py': 'Python', '.go': 'Go', '.rs': 'Rust', '.java': 'Java', '.rb': 'Ruby', '.php': 'PHP', '.cs': 'C#', '.swift': 'Swift', '.kt': 'Kotlin', '.c': 'C', '.h': 'C', '.cpp': 'C++', '.hpp': 'C++' };
const CAPABILITIES = ['symbol_lookup', 'references', 'architecture_query', 'impact_analysis', 'cross_artifact_links'];
const MANIFESTS = ['package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb', 'pyproject.toml', 'requirements.txt', 'Pipfile', 'go.mod', 'Cargo.toml', 'pom.xml', 'build.gradle', 'Gemfile', 'composer.json', 'Makefile'];

function relative(root, file) { return path.relative(root, file).split(path.sep).join('/'); }
async function git(root, args) { try { return (await run('git', ['-C', root, ...args], { windowsHide: true })).stdout.trim(); } catch { return null; } }

async function safeRoot(targetPath) {
  if (typeof targetPath !== 'string' || !path.isAbsolute(targetPath) || !targetPath.trim() || targetPath.includes('\0')) throw new Error('targetPath must be one explicit, absolute directory path.');
  const supplied = path.resolve(targetPath);
  const root = await realpath(supplied).catch(() => { throw new Error('targetPath must exist and resolve without symlinks.'); });
  if (root !== supplied || root === path.parse(root).root || !(await stat(root)).isDirectory()) throw new Error('targetPath must be a non-root directory without symlink ambiguity.');
  return root;
}

async function files(root) {
  const output = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink() || SKIP.has(entry.name)) continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(file); else if (entry.isFile()) output.push(file);
    }
  }
  await visit(root); return output.sort();
}
function command(values, source = null) { return { values: [...new Set(values)].sort(), source }; }
function scriptsFor(scripts, names, manager) { const found = names.filter((name) => typeof scripts?.[name] === 'string'); return command(found.map((name) => `${manager} run ${name}`), found.length ? 'package.json:scripts' : null); }
function frameworks(pkg = {}) { const names = new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]); return [['next', 'Next.js'], ['react', 'React'], ['vue', 'Vue'], ['@angular/core', 'Angular'], ['svelte', 'Svelte'], ['express', 'Express'], ['fastify', 'Fastify'], ['nestjs', 'NestJS']].flatMap(([key, label]) => names.has(key) ? [label] : []); }

export function createCodeIntelligenceProvider({ provider_id, capabilities, availability = 'unknown', evidence = [] }) {
  if (typeof provider_id !== 'string' || !provider_id || !Array.isArray(capabilities) || capabilities.some((item) => !CAPABILITIES.includes(item)) || !['available', 'unknown'].includes(availability) || !Array.isArray(evidence)) throw new Error('Invalid CodeIntelligenceProvider capability data.');
  return { provider_id, capabilities: [...new Set(capabilities)].sort(), availability, evidence: [...new Set(evidence)].sort() };
}

export async function profileProject(targetPath, { now = () => new Date().toISOString() } = {}) {
  const root = await safeRoot(targetPath); const allFiles = await files(root); const paths = allFiles.map((file) => relative(root, file));
  const gitRoot = await git(root, ['rev-parse', '--show-toplevel']);
  const isGitRoot = gitRoot && path.resolve(gitRoot) === root;
  const git_revision = isGitRoot ? await git(root, ['rev-parse', 'HEAD']) : null;
  const status = isGitRoot ? await git(root, ['status', '--porcelain=v1']) : null;
  const source_fingerprint = createHash('sha256').update((await Promise.all(allFiles.map(async (file) => `${relative(root, file)}:${createHash('sha256').update(await readFile(file)).digest('hex')}`))).join('\n')).digest('hex');
  const manifestPaths = MANIFESTS.filter((name) => paths.includes(name));
  let pkg = {}; if (paths.includes('package.json')) { try { pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')); } catch { throw new Error('package.json is not valid JSON.'); } }
  const manager = paths.includes('pnpm-lock.yaml') ? 'pnpm' : paths.includes('yarn.lock') ? 'yarn' : paths.includes('bun.lockb') ? 'bun' : paths.includes('package-lock.json') ? 'npm' : null;
  const scripts = pkg.scripts ?? {}; const npm = manager ?? 'npm';
  const claudeFiles = paths.filter((item) => item === 'CLAUDE.md' || item.startsWith('.claude/') || item === '.mcp.json' || item === '.lsp.json');
  const lspFiles = paths.filter((item) => item === '.lsp.json' || /(^|\/)lsp\.(json|ya?ml)$/i.test(item));
  const providers = lspFiles.length ? [createCodeIntelligenceProvider({ provider_id: 'project-lsp', capabilities: CAPABILITIES, evidence: lspFiles })] : [];
  const unknowns = []; if (!manager && !paths.includes('package.json')) unknowns.push('package manager is not declared by a recognized manifest or lockfile');
  if (!isGitRoot) unknowns.push('target is not a Git repository root');
  if (!lspFiles.length) unknowns.push('no project-local LSP configuration was found');
  if (!providers.length) unknowns.push('no optional code-intelligence provider is configured');
  for (const [name, values] of Object.entries({ build: scriptsFor(scripts, ['build'], npm), test: scriptsFor(scripts, ['test'], npm), lint: scriptsFor(scripts, ['lint'], npm), typecheck: scriptsFor(scripts, ['typecheck', 'check-types'], npm), run: scriptsFor(scripts, ['start', 'dev', 'serve'], npm) })) if (!values.values.length) unknowns.push(`${name} command is not declared in project metadata`);
  return {
    schema_version: '1.0.0', generated_at: now(),
    languages: [...new Set(paths.map((item) => LANGUAGE[path.extname(item).toLowerCase()]).filter(Boolean))].sort(), frameworks: frameworks(pkg).sort(), package_manager: manager,
    commands: { build: scriptsFor(scripts, ['build'], npm), test: scriptsFor(scripts, ['test'], npm), lint: scriptsFor(scripts, ['lint'], npm), typecheck: scriptsFor(scripts, ['typecheck', 'check-types'], npm), run: scriptsFor(scripts, ['start', 'dev', 'serve'], npm) },
    ci: paths.filter((item) => item.startsWith('.github/workflows/') || ['.gitlab-ci.yml', 'azure-pipelines.yml', '.circleci/config.yml'].includes(item)), instructions: paths.filter((item) => ['AGENTS.md', 'CLAUDE.md', 'CONTRIBUTING.md'].includes(path.basename(item))), manifests: manifestPaths,
    claude_code: { files: claudeFiles, capabilities: [...new Set([claudeFiles.some((item) => item.startsWith('.claude/agents/')) && 'custom_agents', claudeFiles.some((item) => item.startsWith('.claude/skills/')) && 'skills', claudeFiles.some((item) => item.startsWith('.claude/rules/')) && 'rules', claudeFiles.includes('.claude/settings.json') && 'settings', claudeFiles.some((item) => item.includes('hooks')) && 'hooks', lspFiles.length && 'lsp_configuration'].filter(Boolean))].sort() },
    code_intelligence_providers: providers, known_unknowns: unknowns.sort(),
    target: { root, git_revision, git_dirty: status === null ? null : Boolean(status), source_fingerprint }
  };
}

export async function detectProfileDrift(profile, targetPath = profile?.target?.root) {
  const current = await profileProject(targetPath);
  return { drifted: !profile || profile.target?.source_fingerprint !== current.target.source_fingerprint || profile.target?.git_revision !== current.target.git_revision || profile.target?.git_dirty !== current.target.git_dirty, current };
}

const ajv = new Ajv2020({ allErrors: true, strict: true }); ajv.addFormat('date-time', { type: 'string', validate: (value) => !Number.isNaN(Date.parse(value)) }); const validate = ajv.compile(schema);
export function validateProjectProfile(profile) { return validate(profile) ? { valid: true, errors: [] } : { valid: false, errors: validate.errors }; }
