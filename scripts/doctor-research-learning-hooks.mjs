import { readFile } from 'node:fs/promises';

const settings = JSON.parse(await readFile(process.argv[2] || '.claude/settings.json', 'utf8'));
const hook = settings.hooks?.Stop?.[0]?.hooks?.[0];
if (!hook || hook.type !== 'command' || hook.command !== 'node "${CLAUDE_PROJECT_DIR}/scripts/recover-research-learning.mjs"' || hook.timeout !== 15 || settings.hooks?.UserPromptSubmit || settings.hooks?.SubagentStop) throw new Error('Invalid research-learning Stop hook configuration.');
console.log(JSON.stringify({ valid: true }));
