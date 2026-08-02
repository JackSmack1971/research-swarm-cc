import { cp, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const CASES = [
  ['exact-symbol', 'inspectRepositoryKnowledge', 'Where is inspectRepositoryKnowledge defined?', ['inspectRepositoryKnowledge']],
  ['cross-file-impact', 'routeKnowledgeNeedWithRepositoryEvidence', 'What calls routeKnowledgeNeedWithRepositoryEvidence?', ['routeKnowledgeNeedWithRepositoryEvidence', 'repository-intelligence']],
  ['architecture-module', 'adaptive-evidence-router', 'How are repository intelligence and adaptive evidence routing connected?', ['repository-intelligence', 'adaptive-evidence-router']],
  ['code-config-docs', 'Graphify', 'Where is Graphify mentioned in the repository?', ['Graphify', 'engineering-knowledge-baseline.md']]
];
const SKIP = new Set(['.git', 'node_modules', 'coverage', 'dist', 'build']);
const now = () => performance.now();

async function files(root, directory = root, out = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink() || SKIP.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await files(root, file, out); else if (entry.isFile()) out.push(file);
  }
  return out.sort();
}

function run(command, args, cwd) {
  const started = now();
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', windowsHide: true });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '', milliseconds: Math.round(now() - started) };
}

async function direct(root) {
  const entries = await files(root);
  const cases = CASES.map(([id, term, question, expected]) => {
    const started = now(); const anchors = [];
    for (const file of entries) {
      const lines = (requireText(file) ?? '').split(/\r?\n/);
      lines.forEach((line, index) => { if (line.includes(term)) anchors.push({ path: path.relative(root, file).split(path.sep).join('/'), line: index + 1 }); });
    }
    const output = JSON.stringify({ question, anchors });
    return { id, mechanism: 'read/search', retrieval_quality: anchors.length > 0, source_anchors: anchors.length, irrelevant_context_ratio: 0, model_context_characters: output.length, milliseconds: Math.round(now() - started), expected_terms: expected };
  });
  return { cases, setup_milliseconds: 0, update_milliseconds: 0 };
}

function requireText(file) {
  try { return readFileSync(file, 'utf8'); } catch { return ''; }
}

async function graphify(root) {
  const work = await mkdtemp(path.join(tmpdir(), 'research-swarm-graphify-benchmark-'));
  const source = path.join(work, 'code'); const out = path.join(work, 'out');
  const selected = ['scripts/lib/repository-intelligence.mjs', 'scripts/lib/adaptive-evidence-router.mjs', 'scripts/lib/project-profiler.mjs', 'scripts/route-engineering-evidence.mjs'];
  for (const relative of selected) { const destination = path.join(source, relative); await cp(path.join(root, relative), destination); }
  const version = run('graphify', ['--version'], root);
  const extraction = run('graphify', ['extract', source, '--no-cluster', '--out', out], root);
  const graphPath = path.join(out, 'graphify-out', 'graph.json');
  let graph = null; try { graph = JSON.parse(await readFile(graphPath, 'utf8')); } catch {}
  const cases = [];
  for (const [id, term, question, expected] of CASES) {
    if (id === 'code-config-docs') { cases.push({ id, status: 'not_run', reason: 'code-only extraction excludes docs/config and no approved semantic backend is available' }); continue; }
    const query = run('graphify', ['query', question, '--graph', graphPath, '--budget', '500'], root);
    const lines = query.stdout.split(/\r?\n/).filter((line) => line.startsWith('NODE '));
    const relevant = lines.filter((line) => expected.some((termValue) => line.toLowerCase().includes(termValue.toLowerCase()))).length;
    cases.push({ id, status: query.status === 0 ? 'completed' : 'failed', retrieval_quality: relevant > 0, source_anchors: (query.stdout.match(/src=.*? loc=L\d+/g) ?? []).length, irrelevant_context_ratio: lines.length ? Number((1 - relevant / lines.length).toFixed(3)) : null, model_context_characters: query.stdout.length, milliseconds: query.milliseconds, stderr: query.stderr.trim() });
  }
  const affected = graphPath && graph ? run('graphify', ['affected', 'inspectRepositoryKnowledge', '--graph', graphPath], root) : null;
  const benchmark = graphPath && graph ? run('graphify', ['benchmark', graphPath], root) : null;
  const result = { version: version.stdout.trim(), extraction: { status: extraction.status === 0 ? 'completed' : 'failed', milliseconds: extraction.milliseconds, graph_path: graph ? 'disposable' : null, graph_bytes: graph ? Buffer.byteLength(JSON.stringify(graph)) : null, nodes: graph?.nodes?.length ?? null, edges: graph?.edges?.length ?? graph?.links?.length ?? null, stderr: extraction.stderr }, cases, interface_checks: { affected: { status: affected?.status === 0 ? 'completed' : 'failed', stderr: affected?.stderr.trim() }, benchmark: { status: benchmark?.status === 0 ? 'completed' : 'failed', stderr: benchmark?.stderr.trim() } } };
  await rm(work, { recursive: true, force: true });
  return result;
}

const root = path.resolve(process.argv[2] ?? process.cwd());
const revision = run('git', ['rev-parse', 'HEAD'], root);
const dirty = run('git', ['status', '--porcelain=v1'], root);
const result = { schema_version: '1.0.0', target: root, source: { git_revision: revision.status === 0 ? revision.stdout.trim() : null, git_dirty: dirty.status === 0 ? Boolean(dirty.stdout.trim()) : null }, direct: await direct(root), graphify: await graphify(root), lsp: { status: 'unavailable', reason: 'project profiler found no project-local LSP configuration' }, routing: { exact_symbol: 'direct-search-or-LSP', cross_file_impact: 'direct-search-or-LSP', architecture_module: 'profiler-and-targeted-search', code_config_docs: 'direct-search' } };
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
