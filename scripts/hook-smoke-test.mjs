import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
const fixture = process.argv[2];
if (!fixture) throw new Error('Usage: node scripts/hook-smoke-test.mjs <stdin-fixture>');
const input = await readFile(fixture, 'utf8');
const result = await new Promise((resolve, reject) => { const child = spawn(process.execPath, ['scripts/recover-research-learning.mjs'], { windowsHide: true, env: process.env }); let stdout = ''; child.stdout.on('data', (chunk) => { stdout += chunk; }); child.on('error', reject); child.on('close', (code) => code === 0 ? resolve({ stdout }) : reject(new Error(`Stop hook exited ${code}.`))); child.stdin.end(input); });
if (result.stdout.trim()) throw new Error('Stop hook must emit no JSON when it does not block.');
console.log(JSON.stringify({ valid: true }));
