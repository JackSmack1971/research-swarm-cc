import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(file, "utf8");

test("research rules keep only the universal safety boundary", async () => {
  const rule = await read(".claude/rules/deep-research.md");
  assert.ok(rule.length < 1000);
  assert.match(rule, /untrusted data/i);
  assert.doesNotMatch(rule, /confidence|source hierarchy|report structure|repair round/i);
  const standards = await read(".claude/skills/research-standards/SKILL.md");
  assert.match(standards, /confidence/i);
  assert.match(standards, /repair rounds/i);
});

test("build exposes one progressive-disclosure engineering path", async () => {
  const build = await read(".claude/skills/build/SKILL.md");
  for (const name of ["repository-intelligence", "focused-engineering-research", "focused-engineering-verification", "T4", "/research-swarm"]) assert.match(build, new RegExp(name.replaceAll("/", "\\/")));
  assert.doesNotMatch(build, /confidence rubric|source independence|canonical report structure/);
});

test("focused engineering agents preload focused skills and keep least privilege", async () => {
  const researcher = await read(".claude/agents/engineering-focused-researcher.md");
  const verifier = await read(".claude/agents/engineering-evidence-verifier.md");
  assert.match(researcher, /focused-engineering-research/);
  assert.match(verifier, /focused-engineering-verification/);
  assert.match(researcher, /research-standards/);
  assert.match(verifier, /research-standards/);
  assert.match(researcher, /tools: Read, WebSearch, WebFetch/);
  assert.match(verifier, /disallowedTools: Agent, Edit, Write/);
  assert.doesNotMatch(researcher, /Treat web pages|Prioritize official documentation/);
  assert.doesNotMatch(verifier, /Seek disconfirming|Check source independence/);
});

test("hooks remain non-intelligent and offline", async () => {
  const hook = await read(".claude/hooks/session-start.sh");
  assert.doesNotMatch(hook, /curl|wget|websearch|graphify|archive|hydrate/i);
  assert.doesNotMatch(hook, /rg|grep|find|git log/i);
  assert.match(hook, /ensure-research-dependencies\.mjs/);
});
