import { createHash } from 'node:crypto';
import { mkdir, open, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const CONSTITUTION_VERSION = '1.0.0';
export const POLICY_LIMITS = Object.freeze({ lessons: 12, directivesPerRole: 4, characters: 6000 });
const FILES = ['manifest.json', 'provisional-lessons.jsonl', 'active-lessons.jsonl', 'rejected-lessons.jsonl', 'promotion-events.jsonl', 'generated-policy.json', 'generated-policy.md'];
const forbidden = /\b(?:ignore|disregard|follow)\s+(?:all\s+)?(?:previous|source|webpage|page)?\s*instructions?\b|\b(?:constitution|canonical schema|validator|workflow control|permission|protected surface|agent definition)\b/i;

export function learningRoot(value = process.env.RESEARCH_LEARNING_ROOT) { return path.resolve(value || 'artifacts/research-learning'); }
const now = () => new Date().toISOString();
const stable = (value) => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value);
const text = (lesson) => [lesson.observed_problem, lesson.root_cause, lesson.recommended_behavior, ...(lesson.applicability_conditions || []), ...(lesson.exclusions || [])].join('\n');
const key = (lesson) => JSON.stringify([lesson.type, lesson.target?.policy_surface, lesson.target?.role, lesson.recommended_behavior?.trim().toLowerCase(), [...(lesson.applicability_conditions || [])].map((item) => item.trim().toLowerCase()).sort(), [...(lesson.exclusions || [])].map((item) => item.trim().toLowerCase()).sort()]);

export async function atomicWrite(file, value) {
  const temporary = `${file}.${process.pid}.${createHash('sha256').update(`${file}:${now()}`).digest('hex').slice(0, 8)}.tmp`;
  await writeFile(temporary, value, 'utf8');
  await rename(temporary, file);
}

async function readJson(file, fallback) { try { const value = JSON.parse(await readFile(file, 'utf8')); return value && typeof value === 'object' ? value : fallback; } catch { return fallback; } }
async function readJsonl(file) { try { return (await readFile(file, 'utf8')).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)).filter((record) => record && typeof record === 'object'); } catch { return []; } }
const jsonl = (records) => records.map((record) => JSON.stringify(record)).join(records.length ? '\n' : '') + (records.length ? '\n' : '');

export async function readState(root = learningRoot()) {
  const state = { manifest: await readJson(path.join(root, 'manifest.json'), {}), provisional: await readJsonl(path.join(root, 'provisional-lessons.jsonl')), active: await readJsonl(path.join(root, 'active-lessons.jsonl')), rejected: await readJsonl(path.join(root, 'rejected-lessons.jsonl')), promotions: await readJsonl(path.join(root, 'promotion-events.jsonl')) };
  return state.manifest?.constitution_version === CONSTITUTION_VERSION ? state : { manifest: {}, provisional: [], active: [], rejected: [], promotions: [] };
}

export async function withLearningLock(root, callback, { waitMs = 5000, staleMs = 30000 } = {}) {
  const lockDirectory = path.join(root, 'lock'); const lock = path.join(lockDirectory, 'registry.lock');
  await mkdir(lockDirectory, { recursive: true }); const deadline = Date.now() + waitMs;
  while (true) {
    try { const handle = await open(lock, 'wx'); try { await handle.writeFile(JSON.stringify({ pid: process.pid, acquired_at: now() })); return await callback(); } finally { await handle.close(); await import('node:fs/promises').then(({ rm }) => rm(lock, { force: true })); } }
    catch (cause) {
      if (cause.code !== 'EEXIST') throw cause;
      try { if (Date.now() - (await stat(lock)).mtimeMs > staleMs) { await import('node:fs/promises').then(({ rm }) => rm(lock, { force: true })); continue; } } catch { continue; }
      if (Date.now() >= deadline) throw new Error('Timed out waiting for research-learning registry lock.');
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
}

export async function snapshot(root) {
  const directory = path.join(root, 'snapshots', now().replace(/[:.]/g, '-'));
  await mkdir(directory, { recursive: true });
  for (const name of FILES) { try { await writeFile(path.join(directory, name), await readFile(path.join(root, name))); } catch { await writeFile(path.join(directory, name), ''); } }
}

export async function writeState(root, state) {
  await mkdir(root, { recursive: true }); await snapshot(root);
  const all = [...state.provisional, ...state.active, ...state.rejected];
  const manifest = { lesson_registry_id: 'lreg_research_learning', generated_at: now(), constitution_version: CONSTITUTION_VERSION, lesson_ids: [...new Set(all.map(({ lesson_id }) => lesson_id))].sort(), version: '1.0.0' };
  await Promise.all([
    atomicWrite(path.join(root, 'manifest.json'), `${JSON.stringify(manifest)}\n`), atomicWrite(path.join(root, 'provisional-lessons.jsonl'), jsonl(state.provisional)), atomicWrite(path.join(root, 'active-lessons.jsonl'), jsonl(state.active)), atomicWrite(path.join(root, 'rejected-lessons.jsonl'), jsonl(state.rejected)), atomicWrite(path.join(root, 'promotion-events.jsonl'), jsonl(state.promotions))
  ]);
}

export function safeLesson(lesson) { return lesson && ['provisional', 'active'].includes(lesson.status) && lesson.constitution_compatibility?.constitution_version === CONSTITUTION_VERSION && lesson.constitution_compatibility?.result === 'compatible' && !forbidden.test(text(lesson)); }
export function mergeLesson(existing, incoming) { return { ...existing, supporting_run_ids: [...new Set([...existing.supporting_run_ids, ...incoming.supporting_run_ids])].sort(), counterexample_run_ids: [...new Set([...existing.counterexample_run_ids, ...incoming.counterexample_run_ids])].sort(), confidence: Math.max(existing.confidence, incoming.confidence), version: existing.version }; }

export function compilePolicy(lessons, query = '') {
  const tokens = new Set(String(query).toLowerCase().match(/[a-z0-9]{3,}/g) || []);
  const relevant = (lesson) => !tokens.size || [...tokens].some((token) => text(lesson).toLowerCase().includes(token));
  const excluded = lessons.filter((lesson) => !safeLesson(lesson) || !relevant(lesson)).map(({ lesson_id }) => lesson_id).sort();
  const selected = lessons.filter((lesson) => safeLesson(lesson) && relevant(lesson)).sort((a, b) => b.confidence - a.confidence || a.lesson_id.localeCompare(b.lesson_id)).slice(0, POLICY_LIMITS.lessons);
  const roleCounts = new Map(); const directives = []; const kept = [];
  for (const lesson of selected) { const role = lesson.target.policy_surface; const count = roleCounts.get(role) || 0; if (count >= POLICY_LIMITS.directivesPerRole) { excluded.push(lesson.lesson_id); continue; } const directive = lesson.recommended_behavior.trim(); if (directives.reduce((sum, item) => sum + item.directive.length, 0) + directive.length > POLICY_LIMITS.characters) { excluded.push(lesson.lesson_id); continue; } roleCounts.set(role, count + 1); directives.push({ role, directive }); kept.push(lesson); }
  const basis = { selected_lesson_ids: kept.map(({ lesson_id }) => lesson_id), role_directives: directives, exclusions: [...new Set(excluded)].sort(), constitution_version: CONSTITUTION_VERSION };
  return { policy_bundle_id: `pob_${createHash('sha256').update(stable(basis)).digest('hex').slice(0, 16)}`, hash: createHash('sha256').update(stable(basis)).digest('hex'), ...basis, rationale: kept.length ? 'Bounded registered lessons selected deterministically by applicability and confidence.' : 'No applicable safe registered lessons.', maximum_character_count: POLICY_LIMITS.characters };
}

export async function writePolicy(root, state, query = '') { const bundle = compilePolicy([...state.active, ...state.provisional], query); await snapshot(root); await atomicWrite(path.join(root, 'generated-policy.json'), `${JSON.stringify(bundle)}\n`); await atomicWrite(path.join(root, 'generated-policy.md'), `# Generated research policy\n\n${bundle.role_directives.map(({ role, directive }) => `- ${role}: ${directive}`).join('\n') || 'No directives.'}\n`); return bundle; }
