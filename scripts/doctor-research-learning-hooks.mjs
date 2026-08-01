import { readFile } from 'node:fs/promises';

const settings = JSON.parse(await readFile(process.argv[2] || '.claude/settings.json', 'utf8'));
const hook = settings.hooks?.Stop?.[0]?.hooks?.[0];
const sessionStart = settings.hooks?.SessionStart?.[0]?.hooks?.[0];
if (settings.workflowSizeGuideline !== 'small' || !sessionStart || sessionStart.type !== 'command' || sessionStart.command !== 'bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/session-start.sh"' || sessionStart.timeout !== 15 || !hook || hook.type !== 'command' || hook.command !== 'node "${CLAUDE_PROJECT_DIR}/scripts/recover-research-learning.mjs"' || hook.timeout !== 15 || settings.hooks?.UserPromptSubmit || settings.hooks?.SubagentStop) throw new Error('Invalid research-learning hook configuration.');
console.log(JSON.stringify({ valid: true }));
