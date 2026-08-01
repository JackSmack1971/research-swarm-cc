import Ajv2020 from 'ajv/dist/2020.js';
import changeContractSchema from '../../engineering/schemas/change-contract.schema.json' with { type: 'json' };
import decisionSchema from '../../engineering/schemas/decision.schema.json' with { type: 'json' };
import uncertaintySchema from '../../engineering/schemas/uncertainty.schema.json' with { type: 'json' };
import prototypeExperimentSchema from '../../engineering/schemas/prototype-experiment.schema.json' with { type: 'json' };
import { validatePrototypeExperiment } from './prototype-lane.mjs';
import { profileProject } from './project-profiler.mjs';

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
ajv.addFormat('date-time', { type: 'string', validate: (value) => !Number.isNaN(Date.parse(value)) });
ajv.addSchema(decisionSchema); ajv.addSchema(uncertaintySchema); ajv.addSchema(prototypeExperimentSchema);
const validate = ajv.compile(changeContractSchema);
const unique = (items, key, label, errors) => {
  const ids = items.map((item) => item[key] ?? item.id);
  if (new Set(ids).size !== ids.length) errors.push(`Duplicate ${label} ID.`);
};
const currentIds = (contract, type) => ({ requirement: contract.requirements.map(({ requirement_id }) => requirement_id), criterion: contract.acceptance_criteria.map(({ criterion_id }) => criterion_id), constraint: contract.constraints.map(({ id }) => id), non_goal: contract.non_goals.map(({ id }) => id), risk: contract.risks.map(({ risk_id }) => risk_id) }[type]);

export function validateChangeContract(contract) {
  if (!validate(contract)) return { valid: false, errors: validate.errors };
  const errors = [];
  unique(contract.decisions, 'decision_id', 'decision', errors); unique(contract.requirements, 'requirement_id', 'requirement', errors);
  unique(contract.acceptance_criteria, 'criterion_id', 'criterion', errors); unique(contract.constraints, 'id', 'constraint', errors);
  unique(contract.non_goals, 'id', 'non-goal', errors); unique(contract.risks, 'risk_id', 'risk', errors); unique(contract.uncertainties, 'uncertainty_id', 'uncertainty', errors);
  if (contract.constraints.some(({ id }) => !id.startsWith('con_'))) errors.push('Constraint IDs must use the con_ prefix.');
  if (contract.non_goals.some(({ id }) => !id.startsWith('ng_'))) errors.push('Non-goal IDs must use the ng_ prefix.');
  const decisionIds = new Set(contract.decisions.map(({ decision_id }) => decision_id));
  const requirementIds = new Set(contract.requirements.map(({ requirement_id }) => requirement_id));
  const evidenceIds = new Set(contract.evidence_references);
  for (const decision of contract.decisions) for (const evidence of decision.evidence_references) if (!evidenceIds.has(evidence)) errors.push(`Decision ${decision.decision_id} references evidence outside the contract.`);
  for (const requirement of contract.requirements) for (const decision of requirement.decision_ids) if (!decisionIds.has(decision)) errors.push(`Requirement ${requirement.requirement_id} is not authorized by a contract decision.`);
  for (const criterion of contract.acceptance_criteria) for (const requirement of criterion.requirement_ids) if (!requirementIds.has(requirement)) errors.push(`Criterion ${criterion.criterion_id} references an unknown requirement.`);
  const requiredPrototype = contract.uncertainties.filter(({ kind, status, downstream_dependency }) => kind === 'experiential' && status === 'unresolved' && downstream_dependency);
  if (contract.lifecycle_state !== 'draft' && requiredPrototype.length) errors.push('A contract with unresolved required prototype questions must remain draft.');
  if (contract.lifecycle_state === 'accepted' && contract.uncertainties.some(({ status, downstream_dependency }) => status === 'unresolved' && downstream_dependency)) errors.push('An accepted contract cannot contain unresolved execution-relevant uncertainty.');
  for (const experiment of contract.prototype_experiments ?? []) {
    const result = validatePrototypeExperiment(experiment); if (!result.valid) errors.push(`Prototype experiment ${experiment?.experiment_id ?? 'unknown'} is invalid.`);
    if (!contract.uncertainties.some(({ uncertainty_id }) => uncertainty_id === experiment.linked_uncertainty_id)) errors.push(`Prototype experiment ${experiment.experiment_id} links an uncertainty outside the contract.`);
    for (const decision of experiment.decision_references) if (!decisionIds.has(decision)) errors.push(`Prototype experiment ${experiment.experiment_id} references a decision outside the contract.`);
  }
  if (contract.change_relationship) {
    unique(contract.change_relationship.deltas, 'operation_id', 'delta operation', errors);
    for (const delta of contract.change_relationship.deltas) {
      if (delta.operation === 'modify' && delta.previous.id !== delta.next.id) errors.push(`Delta ${delta.operation_id} must preserve the modified entity ID.`);
      if (delta.operation !== 'remove' && !currentIds(contract, delta.entity_type).includes(delta.next.id)) errors.push(`Delta ${delta.operation_id} next entity is absent from the current contract.`);
      if (delta.operation === 'remove' && currentIds(contract, delta.entity_type).includes(delta.previous.id)) errors.push(`Delta ${delta.operation_id} removes an entity still present in the current contract.`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function renderChangeContract(contract) {
  const result = validateChangeContract(contract); if (!result.valid) throw new Error(`Change contract validation failed: ${JSON.stringify(result.errors)}`);
  const lines = [`# Change Contract: ${contract.contract_id}`, '', `State: ${contract.lifecycle_state}`, `Owner: ${contract.owner.kind}:${contract.owner.identifier}`, '', '## Goal', '', contract.goal];
  if (contract.outcome) lines.push('', '## Outcome', '', contract.outcome);
  lines.push('', '## Base repository', '', `- Identity: ${contract.base_repository.identity}`, `- Revision: ${contract.base_repository.git_revision ?? 'unavailable'}`, `- Dirty: ${contract.base_repository.git_dirty ?? 'unavailable'}`, `- Fingerprint: ${contract.base_repository.source_fingerprint}`, '', '## Requirements', ...contract.requirements.map((item) => `- ${item.requirement_id}: ${item.statement} (decisions: ${item.decision_ids.join(', ')})`), '', '## Acceptance criteria', ...contract.acceptance_criteria.map((item) => `- ${item.criterion_id}: ${item.observable_proof} (requirements: ${item.requirement_ids.join(', ')})`));
  for (const [title, items] of [['Constraints', contract.constraints], ['Non-goals', contract.non_goals], ['Risks', contract.risks], ['Uncertainties', contract.uncertainties]]) if (items.length) lines.push('', `## ${title}`, ...items.map((item) => `- ${item.id ?? item.risk_id ?? item.uncertainty_id}: ${item.statement ?? item.rationale ?? `${item.status}; execution-relevant: ${item.downstream_dependency}`}`));
  if (contract.change_relationship) lines.push('', '## Change lineage', '', `- Parent: ${contract.change_relationship.parent_contract_id} (${contract.change_relationship.parent_contract_sha256})`, ...contract.change_relationship.deltas.map((item) => `- ${item.operation_id}: ${item.operation} ${item.entity_type} — ${item.rationale}`));
  return `${lines.join('\n')}\n`;
}

export async function detectChangeContractDrift(contract, targetPath = contract?.base_repository?.root) {
  const checked = validateChangeContract(contract); if (!checked.valid) throw new Error(`Change contract validation failed: ${JSON.stringify(checked.errors)}`);
  const current = await profileProject(targetPath);
  const base = contract.base_repository;
  return { drifted: base.root !== current.target.root || base.git_revision !== current.target.git_revision || base.git_dirty !== current.target.git_dirty || base.source_fingerprint !== current.target.source_fingerprint, expected: base, current: current.target };
}
