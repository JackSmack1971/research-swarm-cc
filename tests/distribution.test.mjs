import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");
const cli = path.join(root, "scripts", "distribute.mjs");
async function command(args) { return run(process.execPath, [cli, ...args], { cwd: root }); }
async function target() { return mkdtemp(path.join(os.tmpdir(), "research-swarm-dist-")); }

test("install, dry-run, update, rollback, status, and uninstall preserve target data", async () => {
  const dir = await target();
  try {
    await mkdir(path.join(dir, "artifacts", "research-runs"), { recursive: true });
    await writeFile(path.join(dir, "artifacts", "research-runs", "keep.txt"), "canonical\n");
    await mkdir(path.join(dir, ".claude"), { recursive: true });
    await writeFile(path.join(dir, ".claude", "settings.json"), "{\"user\":true}\n");
    const dry = await command(["install", "--target", dir, "--dry-run"]);
    assert.match(dry.stdout, /\"action\": \"install\"/);
    await command(["install", "--target", dir]);
    const before = await readFile(path.join(dir, ".claude", "agents", "research-planner.md"), "utf8");
    await readFile(path.join(dir, ".claude", "skills", "repository-intelligence", "SKILL.md"), "utf8");
    await readFile(path.join(dir, ".claude", "skills", "focused-engineering-research", "SKILL.md"), "utf8");
    await readFile(path.join(dir, ".claude", "skills", "focused-engineering-verification", "SKILL.md"), "utf8");
    await command(["update", "--target", dir]);
    const status = await command(["status", "--target", dir]);
    assert.match(status.stdout, /\"state\": \"installed\"/);
    await command(["rollback", "--target", dir]);
    assert.equal(await readFile(path.join(dir, ".claude", "agents", "research-planner.md"), "utf8"), before);
    await command(["uninstall", "--target", dir]);
    assert.equal(await readFile(path.join(dir, "artifacts", "research-runs", "keep.txt"), "utf8"), "canonical\n");
    assert.equal(await readFile(path.join(dir, ".claude", "settings.json"), "utf8"), "{\"user\":true}\n");
    await assert.rejects(readFile(path.join(dir, ".claude", "skills", "repository-intelligence", "SKILL.md"), "utf8"), /ENOENT/);
    assert.equal((await command(["status", "--target", dir])).stdout.includes('"state": "uninstalled"'), true);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("conflicts fail closed", async () => {
  const dir = await target();
  try {
    await mkdir(path.join(dir, ".claude", "agents"), { recursive: true });
    await writeFile(path.join(dir, ".claude", "agents", "research-planner.md"), "user file\n");
    await assert.rejects(command(["install", "--target", dir]), /conflict/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("symlinked owned paths fail closed", async (t) => {
  const dir = await target();
  try {
    await mkdir(path.join(dir, ".claude", "agents"), { recursive: true });
    const outside = path.join(dir, "outside.md");
    await writeFile(outside, "outside\n");
    try { await symlink(outside, path.join(dir, ".claude", "agents", "research-planner.md")); }
    catch (error) { if (error.code === "EPERM") return t.skip("symlink creation is unavailable"); throw error; }
    await assert.rejects(command(["install", "--target", dir]), /symlink|regular file/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
