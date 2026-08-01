import { createHash } from 'node:crypto';
import { access } from 'node:fs/promises';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../../engineering/schemas/task-graph.schema.json' with { type: 'json' };
import capsuleSchema from '../../engineering/schemas/context-capsule.schema.json' with { type: 'json' };
import profileSchema from '../../engineering/schemas/project-profile.schema.json' with { type: 'json' };
import decisionSchema from '../../engineering/schemas/decision.schema.json' with { type: 'json' };
import { detectChangeContractDrift, validateChangeContract } from './change-contract.mjs';
import { profileProject } from './project-profiler.mjs';

const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addFormat('date-time', { type: 'string', validate: (value) => !Number.isNaN(Date.parse(value)) }); ajv.addSchema(profileSchema); ajv.addSchema(decisionSchema); const validate = ajv.compile(schema); const validateCapsule = ajv.compile(capsuleSchema);
const stable = (value) => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value);
export const sha256 = (value) => createHash('sha256').update(stable(value)).digest('hex');
const lineage = (contract) => ({ criteria: new Set(contract.acceptance_criteria.map(({ criterion_id }) => criterion_id)), requirements: new Map(contract.requirements.map((item) => [item.requirement_id, item])), decisions: new Map(contract.decisions.map((item) => [item.decision_id, item])) });
const reaches = (tasks, from, target, seen = new Set()) => { if (from === target) return true; if (seen.has(from)) return false; seen.add(from); return (tasks.find(({ task_id }) => task_id === from)?.depends_on ?? []).some((next) => reaches(tasks, next, target, seen)); };

export function validateTaskGraph(graph, contract) {
  if (!validate(graph)) return { valid: false, errors: validate.errors };
  const errors = []; const ids = new Set(); const criterionIds = contract ? lineage(contract).criteria : null;
  for (const task of graph.tasks) { if (ids.has(task.task_id)) errors.push(`Duplicate task ID: ${task.task_id}.`); ids.add(task.task_id); if (task.depends_on.includes(task.task_id)) errors.push(`Task ${task.task_id} cannot depend on itself.`); if (criterionIds) for (const criterion of task.criterion_ids) if (!criterionIds.has(criterion)) errors.push(`Task ${task.task_id} references an unknown criterion: ${criterion}.`); }
  for (const task of graph.tasks) for (const dependency of task.depends_on) if (!ids.has(dependency)) errors.push(`Task ${task.task_id} depends on an unknown task: ${dependency}.`);
  for (const task of graph.tasks) for (const dependency of task.depends_on) if (reaches(graph.tasks, dependency, task.task_id)) errors.push(`Task dependency cycle includes ${task.task_id}.`);
  if (criterionIds) for (const criterion of criterionIds) if (!graph.tasks.some((task) => task.criterion_ids.includes(criterion))) errors.push(`Acceptance criterion is not covered by a task: ${criterion}.`);
  for (let i = 0; i < graph.tasks.length; i++) for (const later of graph.tasks.slice(i + 1)) { const current = graph.tasks[i]; const shared = current.code_anchors.map(({ path: item }) => item).filter((item) => later.code_anchors.some((anchor) => anchor.path === item || anchor.path.startsWith(`${item}/`) || item.startsWith(`${anchor.path}/`))); if (shared.length && !reaches(graph.tasks, current.task_id, later.task_id) && !reaches(graph.tasks, later.task_id, current.task_id)) errors.push(`Task collision: ${current.task_id} and ${later.task_id} both anchor ${shared.join(', ')} without an explicit dependency.`); }
  const phases = graph.tasks.filter(({ slice }) => ['expand', 'migrate', 'contract'].includes(slice)); if (phases.length) { const ranks = { expand: 0, migrate: 1, contract: 2 }; for (const task of phases) for (const dependency of task.depends_on) { const prior = graph.tasks.find(({ task_id }) => task_id === dependency); if (prior && ranks[prior.slice] > ranks[task.slice]) errors.push(`Migration ordering requires expand → migrate → contract.`); } }
  return { valid: errors.length === 0, errors };
}

export async function compileTaskGraph({ graph_id, contract, targetPath, tasks }) {
  const contractCheck = validateChangeContract(contract); if (!contractCheck.valid || contract.lifecycle_state !== 'accepted') throw new Error('Only a valid accepted Change Contract can compile a task graph.');
  const drift = await detectChangeContractDrift(contract, targetPath); if (drift.drifted) throw new Error('Change Contract base drift detected; regenerate the contract before compiling tasks.');
  const graph = { schema_version: '1.0.0', graph_id, contract: { contract_id: contract.contract_id, sha256: sha256(contract) }, base_repository: drift.current, tasks };
  const checked = validateTaskGraph(graph, contract); if (!checked.valid) throw new Error(`Task graph validation failed: ${JSON.stringify(checked.errors)}`); return graph;
}

export async function detectTaskGraphDrift(graph, contract, targetPath = graph?.base_repository?.root) {
  if (contract?.lifecycle_state !== 'accepted' || !validateChangeContract(contract).valid) return { drifted: true, reason: 'invalid_or_unaccepted_contract', current: null };
  const checked = validateTaskGraph(graph, contract); if (!checked.valid) return { drifted: true, reason: 'invalid_graph', current: null };
  const current = await profileProject(targetPath); const expectedHash = contract ? sha256(contract) : graph.contract.sha256;
  return { drifted: graph.contract.contract_id !== contract?.contract_id || graph.contract.sha256 !== expectedHash || stable(graph.base_repository) !== stable(current.target), current: current.target };
}

export async function compileContextCapsules(graph, contract, targetPath) {
  const drift = await detectTaskGraphDrift(graph, contract, targetPath); if (drift.drifted) throw new Error('Task graph source drift detected; regenerate graph and capsules.');
  const { requirements, decisions } = lineage(contract);
  for (const task of graph.tasks) for (const anchor of task.code_anchors) await access(path.join(targetPath, anchor.path)).catch(() => { throw new Error(`Task ${task.task_id} anchor is missing: ${anchor.path}`); });
  return graph.tasks.map((task) => {
    const criteria = contract.acceptance_criteria.filter(({ criterion_id }) => task.criterion_ids.includes(criterion_id)); const requirementIds = new Set(criteria.flatMap(({ requirement_ids }) => requirement_ids)); const decisionIds = new Set([...requirementIds].flatMap((id) => requirements.get(id).decision_ids));
    const capsule = { schema_version: '1.0.0', task_id: task.task_id, objective: task.objective, acceptance_criteria: criteria, decisions: [...decisionIds].sort().map((id) => decisions.get(id)), non_goals: contract.non_goals, base_repository: graph.base_repository, evidence_references: [...decisionIds].flatMap((id) => decisions.get(id).evidence_references).filter((item, index, all) => all.indexOf(item) === index).sort(), code_anchors: task.code_anchors, verification: task.verification, risks: contract.risks, stop_conditions: ['Stop if the base revision, contract hash, or anchor changes.', 'Escalate if work exceeds this task or conflicts with a dependency.', 'Do not execute production changes without later authorization.'] };
    if (!validateCapsule(capsule)) throw new Error(`Context capsule validation failed: ${JSON.stringify(validateCapsule.errors)}`); return capsule;
  });
}

export function validateContextCapsule(capsule) { return validateCapsule(capsule) ? { valid: true, errors: [] } : { valid: false, errors: validateCapsule.errors }; }

export function renderContextCapsule(capsule) { return `# Task capsule: ${capsule.task_id}\n\n## Objective\n\n${capsule.objective}\n\n## Acceptance criteria\n\n${capsule.acceptance_criteria.map(({ criterion_id, observable_proof }) => `- ${criterion_id}: ${observable_proof}`).join('\n')}\n\n## Code anchors\n\n${capsule.code_anchors.map(({ path, reason }) => `- ${path}: ${reason}`).join('\n')}\n\n## Verification\n\n${capsule.verification.commands.map((command) => `- ${command}`).join('\n')}\n\n## Stop conditions\n\n${capsule.stop_conditions.map((condition) => `- ${condition}`).join('\n')}\n`; }
