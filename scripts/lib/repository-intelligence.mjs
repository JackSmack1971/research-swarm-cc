import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../../engineering/schemas/repository-evidence.schema.json' with { type: 'json' };
import { profileProject } from './project-profiler.mjs';
import { validateKnowledgeNeed } from './adaptive-evidence-router.mjs';

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validate = ajv.compile(schema);
const SKIP = new Set(['.git', 'node_modules', '.venv', 'coverage', 'dist', 'build']);
const relative = (root, file) => path.relative(root, file).split(path.sep).join('/');

async function repositoryFiles(root, directory = root, result = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink() || SKIP.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await repositoryFiles(root, file, result); else if (entry.isFile()) result.push(file);
  }
  return result.sort();
}

function validPath(root, candidate) {
  const file = path.resolve(root, candidate);
  if (file !== root && !file.startsWith(`${root}${path.sep}`)) throw new Error('Repository evidence path must remain inside targetPath.');
  return file;
}

function result(need, profile, values) {
  const evidence = { schema_version: '1.0.0', repository_evidence_id: `ree_${need.knowledge_need_id.slice(3)}`, knowledge_need_id: need.knowledge_need_id, source: { root: profile.target.root, git_revision: profile.target.git_revision, git_dirty: profile.target.git_dirty, source_fingerprint: profile.target.source_fingerprint }, ...values, non_authorizing: true };
  if (!validate(evidence)) throw new Error(`Invalid repository evidence: ${JSON.stringify(validate.errors)}`);
  return evidence;
}

export function validateRepositoryEvidence(evidence) { return validate(evidence) ? { valid: true, errors: [] } : { valid: false, errors: validate.errors }; }

export async function inspectRepositoryKnowledge(need, targetPath, { file, text, symbol, dependency, lsp, now } = {}) {
  if (!validateKnowledgeNeed(need).valid) throw new Error('Invalid knowledge need.');
  const profile = await profileProject(targetPath, { now });
  const root = profile.target.root;
  if (file || text) {
    const targetFiles = file ? [validPath(root, file)] : await repositoryFiles(root);
    const anchors = [];
    const facts = [];
    for (const candidate of targetFiles) {
      const contents = await readFile(candidate, 'utf8').catch(() => null);
      if (contents === null) continue;
      const lines = contents.split(/\r?\n/);
      if (file) anchors.push({ path: relative(root, candidate), kind: 'file' });
      if (text) lines.forEach((line, index) => { if (line.includes(text)) { anchors.push({ path: relative(root, candidate), line: index + 1, kind: 'text', excerpt: line.trim().slice(0, 240) }); facts.push(`${relative(root, candidate)}:${index + 1} contains the requested text.`); } });
    }
    return result(need, profile, { anchors, observed_facts: facts.length ? facts : file ? [`${file} is present and readable.`] : [], unresolved_subquestions: facts.length || file ? [] : [text ? `No repository file contains '${text}'.` : 'The requested file was not found.'], confidence: anchors.length ? 'high' : 'low', provenance_type: 'direct_observation', mechanism: text ? 'search' : 'read', external_evidence_necessary: false });
  }
  if (symbol) {
    if (typeof lsp === 'function' && profile.code_intelligence_providers.length) {
      const observed = await lsp({ root, symbol });
      return result(need, profile, { anchors: observed.anchors ?? [], observed_facts: observed.facts ?? [], unresolved_subquestions: observed.unresolved_subquestions ?? [], confidence: observed.facts?.length ? 'high' : 'low', provenance_type: 'lsp_observation', mechanism: 'lsp', external_evidence_necessary: false });
    }
    return result(need, profile, { anchors: [], observed_facts: [], unresolved_subquestions: ['No callable project LSP is available for the requested symbol.'], confidence: 'low', provenance_type: 'lsp_observation', mechanism: 'lsp', external_evidence_necessary: false });
  }
  if (dependency) {
    const packagePath = validPath(root, 'package.json');
    const pkg = JSON.parse(await readFile(packagePath, 'utf8').catch(() => '{}'));
    const version = pkg.dependencies?.[dependency] ?? pkg.devDependencies?.[dependency] ?? null;
    return result(need, profile, { anchors: version ? [{ path: 'package.json', kind: 'metadata', excerpt: `${dependency}: ${version}` }] : [], observed_facts: version ? [`package.json declares ${dependency} at ${version}.`] : [], unresolved_subquestions: version ? [] : [`No package.json dependency declaration found for ${dependency}.`], confidence: version ? 'high' : 'low', provenance_type: 'deterministic_metadata', mechanism: 'metadata', external_evidence_necessary: false });
  }
  return result(need, profile, { anchors: [{ path: '.', kind: 'graph-candidate', excerpt: 'Structural repository relationship requires graph intelligence.' }], observed_facts: [], unresolved_subquestions: ['Cross-file, cross-artifact, or impact relationships need a future Graphify candidate evaluation.'], confidence: 'low', provenance_type: 'graphify_candidate', mechanism: 'graphify-candidate', external_evidence_necessary: false });
}
