#!/usr/bin/env node
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const VERSION = "1.0.0";
const MANIFEST_DIR = ".research-swarm";
const MANIFEST_FILE = "distribution-manifest.json";
const BACKUP_DIR = "distribution-backups";
const SOURCE_SPEC = "distribution/manifest.json";

const fail = (message) => { throw new Error(message); };
const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const rel = (value) => value.replaceAll("\\", "/");
const isInside = (root, candidate) => {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
};

async function statOrNull(file) { try { return await fs.lstat(file); } catch (error) { if (error.code === "ENOENT") return null; throw error; } }
async function assertSafePath(root, file, allowMissing = true) {
  if (!isInside(root, file)) fail(`path escapes target: ${file}`);
  let current = root;
  const parts = path.relative(root, file).split(path.sep).filter(Boolean);
  for (const part of parts) {
    current = path.join(current, part);
    const info = await statOrNull(current);
    if (!info && allowMissing) continue;
    if (!info) fail(`missing path: ${current}`);
    if (info.isSymbolicLink()) fail(`symlink refused: ${current}`);
    if (current !== file && !info.isDirectory()) fail(`path component is not a directory: ${current}`);
  }
  return file;
}
async function readJson(file) { return JSON.parse(await fs.readFile(file, "utf8")); }
async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
async function walk(root) {
  const output = [];
  async function visit(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) fail(`source symlink refused: ${file}`);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile()) output.push(file);
      else fail(`unsupported source entry: ${file}`);
    }
  }
  await visit(root);
  return output;
}
function selected(relative, spec) {
  const normalized = rel(relative);
  if (spec.bootstrap.exclude.includes(normalized)) return false;
  return spec.bootstrap.roots.some((root) => root.endsWith("-") ? normalized.startsWith(root) : normalized === root || normalized.startsWith(`${root}/`));
}
async function sourceFiles(source, spec) {
  const candidates = [];
  for (const root of spec.bootstrap.roots) {
    const prefixRoot = root.endsWith("-") ? path.dirname(root) : root;
    const prefix = path.join(source, prefixRoot);
    const info = await statOrNull(prefix);
    if (!info) fail(`source asset root missing: ${prefixRoot}`);
    if (info.isSymbolicLink()) fail(`source symlink refused: ${prefix}`);
    if (info.isDirectory()) candidates.push(...await walk(prefix));
    else if (info.isFile()) candidates.push(prefix);
  }
  const unique = [...new Set(candidates)].filter((file) => selected(path.relative(source, file), spec)).sort();
  return unique.map((file) => ({ source: file, relative: rel(path.relative(source, file)) }));
}
async function loadTarget(target) {
  const root = path.resolve(target);
  const info = await statOrNull(root);
  if (!info || !info.isDirectory() || info.isSymbolicLink()) fail(`target must be a real directory: ${target}`);
  return root;
}
async function targetManifest(root) { return readJson(path.join(root, MANIFEST_DIR, MANIFEST_FILE)); }
async function fileHash(file) { const data = await fs.readFile(file); return sha256(data); }
async function writeAtomic(file, data) {
  const temporary = `${file}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(temporary, data, { flag: "wx" });
  await fs.rename(temporary, file);
}
async function copyOwned(root, assets, previous, backupRoot) {
  const snapshots = [];
  try {
    for (const asset of assets) {
      const destination = path.join(root, asset.relative);
      await assertSafePath(root, destination);
      const current = await statOrNull(destination);
      const old = previous?.files?.find((entry) => entry.path === asset.relative);
      if (current && !current.isFile()) fail(`owned destination is not a regular file: ${asset.relative}`);
      if (current && (!old || (await fileHash(destination)) !== old.sha256)) fail(`conflict: ${asset.relative}`);
      const bytes = await fs.readFile(asset.source);
      if (current) {
        const backup = path.join(backupRoot, asset.relative);
        await assertSafePath(root, backup);
        await fs.mkdir(path.dirname(backup), { recursive: true });
        await fs.writeFile(backup, await fs.readFile(destination));
        snapshots.push({ destination, backup, old });
      }
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await writeAtomic(destination, bytes);
    }
  } catch (error) {
    for (const snapshot of snapshots.reverse()) {
      if (snapshot.old) await writeAtomic(snapshot.destination, await fs.readFile(snapshot.backup));
    }
    throw error;
  }
  return snapshots;
}
async function install(source, target, mode) {
  const spec = await readJson(path.join(source, SOURCE_SPEC));
  if (spec.version !== VERSION) fail(`unsupported source version: ${spec.version}`);
  const root = await loadTarget(target);
  const manifestPath = path.join(root, MANIFEST_DIR, MANIFEST_FILE);
  const existing = await statOrNull(manifestPath);
  if (existing) {
    const installed = await targetManifest(root);
    if (installed.state === "installed") return update(source, root, mode);
  }
  const assets = await sourceFiles(source, spec);
  const plan = assets.map(({ relative }) => ({ path: relative, action: "create" }));
  if (mode === "dry-run") return { action: "install", version: spec.version, plan };
  const backupRoot = path.join(root, MANIFEST_DIR, BACKUP_DIR, `install-${Date.now()}`);
  await fs.mkdir(backupRoot, { recursive: true });
  await copyOwned(root, assets, null, backupRoot);
  await writeJson(manifestPath, { name: spec.name, version: spec.version, state: "installed", files: await Promise.all(assets.map(async ({ relative }) => ({ path: relative, sha256: await fileHash(path.join(root, relative)) }))), backups: [] });
  return { action: "install", version: spec.version, files: assets.length };
}
async function update(source, root, mode) {
  const spec = await readJson(path.join(source, SOURCE_SPEC));
  const manifestPath = path.join(root, MANIFEST_DIR, MANIFEST_FILE);
  const previous = await targetManifest(root);
  if (previous.state !== "installed") return install(source, root, mode);
  if (previous.name !== spec.name) fail("target is owned by a different product");
  const assets = await sourceFiles(source, spec);
  const nextPaths = new Set(assets.map(({ relative }) => relative));
  if (previous.files.some((entry) => !nextPaths.has(entry.path))) fail("migration required: owned source asset was removed");
  const plan = assets.map(({ relative }) => ({ path: relative, action: "update", previous: previous.files.find((entry) => entry.path === relative)?.sha256 ?? null }));
  if (mode === "dry-run") return { action: "update", version: spec.version, plan };
  const backupRoot = path.join(root, MANIFEST_DIR, BACKUP_DIR, `update-${Date.now()}`);
  await fs.mkdir(backupRoot, { recursive: true });
  await copyOwned(root, assets, previous, backupRoot);
  const next = { ...previous, version: spec.version, state: "installed", files: await Promise.all(assets.map(async ({ relative }) => ({ path: relative, sha256: await fileHash(path.join(root, relative)) }))), backups: [...(previous.backups ?? []), { version: previous.version, root: rel(path.relative(root, backupRoot)) }] };
  await writeJson(manifestPath, next);
  return { action: "update", version: spec.version, files: assets.length };
}
async function uninstall(root, mode) {
  const manifestPath = path.join(root, MANIFEST_DIR, MANIFEST_FILE);
  const manifest = await targetManifest(root);
  if (manifest.state !== "installed") return { action: "uninstall", files: 0 };
  const plan = manifest.files.map((entry) => ({ path: entry.path, action: "remove" }));
  if (mode === "dry-run") return { action: "uninstall", plan };
  for (const entry of manifest.files) {
    const file = path.join(root, entry.path);
    const info = await statOrNull(file);
    if (!info) continue;
    await assertSafePath(root, file, false);
    if (!info.isFile() || await fileHash(file) !== entry.sha256) fail(`refusing to remove changed owned file: ${entry.path}`);
  }
  for (const entry of manifest.files) { const file = path.join(root, entry.path); if (await statOrNull(file)) await fs.unlink(file); }
  await writeJson(manifestPath, { ...manifest, state: "uninstalled", uninstalledAt: new Date().toISOString() });
  return { action: "uninstall", files: manifest.files.length };
}
async function rollback(root, mode) {
  const manifestPath = path.join(root, MANIFEST_DIR, MANIFEST_FILE);
  const manifest = await targetManifest(root);
  const backup = manifest.backups?.at(-1);
  if (!backup) return { action: "rollback", files: 0, status: "nothing-to-rollback" };
  const backupRoot = path.join(root, backup.root);
  const plan = manifest.files.map((entry) => ({ path: entry.path, action: "restore" }));
  if (mode === "dry-run") return { action: "rollback", plan };
  for (const entry of manifest.files) {
    const file = path.join(root, entry.path);
    const current = await statOrNull(file);
    if (current && (!current.isFile() || await fileHash(file) !== entry.sha256)) fail(`refusing to rollback changed owned file: ${entry.path}`);
  }
  for (const entry of manifest.files) {
    const file = path.join(root, entry.path);
    const backupFile = path.join(backupRoot, entry.path);
    if ((await statOrNull(backupFile))?.isFile()) { await assertSafePath(root, file); await writeAtomic(file, await fs.readFile(backupFile)); }
    else if (await statOrNull(file)) await fs.unlink(file);
  }
  const restoredVersion = backup.version;
  const files = await Promise.all(manifest.files.map(async (entry) => ({ path: entry.path, sha256: await fileHash(path.join(root, entry.path)) })));
  await writeJson(manifestPath, { ...manifest, version: restoredVersion, files, backups: manifest.backups.slice(0, -1), rolledBackAt: new Date().toISOString() });
  return { action: "rollback", version: restoredVersion, files: files.length };
}
async function status(root) { const manifest = await targetManifest(root); return { name: manifest.name, version: manifest.version, state: manifest.state, files: manifest.files.length, backups: manifest.backups?.length ?? 0 }; }

const args = process.argv.slice(2);
const command = args[0];
const mode = args.includes("--dry-run") ? "dry-run" : "apply";
const option = (name, fallback) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : fallback; };
const target = option("--target", args[1]);
const source = path.resolve(option("--source", path.resolve(import.meta.dirname, "..")));
try {
  if (!["install", "update", "uninstall", "rollback", "status"].includes(command)) fail("usage: distribute.mjs <install|update|uninstall|rollback|status> --target <directory> [--source <repo>] [--dry-run]");
  const root = await loadTarget(target);
  const result = command === "install" ? await install(source, root, mode) : command === "update" ? await update(source, root, mode) : command === "uninstall" ? await uninstall(root, mode) : command === "rollback" ? await rollback(root, mode) : await status(root);
  console.log(JSON.stringify(result, null, 2));
} catch (error) { console.error(`distribution failed: ${error.message}`); process.exitCode = 1; }
