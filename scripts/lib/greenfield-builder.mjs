import Ajv2020 from 'ajv/dist/2020.js';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import planSchema from '../../engineering/schemas/greenfield-plan.schema.json' with { type: 'json' };
import contractSchema from '../../engineering/schemas/change-contract.schema.json' with { type: 'json' };
import decisionSchema from '../../engineering/schemas/decision.schema.json' with { type: 'json' };
import uncertaintySchema from '../../engineering/schemas/uncertainty.schema.json' with { type: 'json' };
import prototypeExperimentSchema from '../../engineering/schemas/prototype-experiment.schema.json' with { type: 'json' };
import { detectChangeContractDrift, validateChangeContract } from './change-contract.mjs';
import { routeUncertainty } from './decision-router.mjs';
import { profileProject } from './project-profiler.mjs';

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
ajv.addFormat('date-time', { type: 'string', validate: (value) => !Number.isNaN(Date.parse(value)) });
ajv.addSchema(contractSchema); ajv.addSchema(decisionSchema); ajv.addSchema(uncertaintySchema); ajv.addSchema(prototypeExperimentSchema);
const validatePlanRecord = ajv.compile(planSchema);
const safePath = (file) => typeof file === 'string' && file !== '' && !path.isAbsolute(file) && !file.includes('\0') && !file.split('/').includes('..') && !file.split('\\').includes('..') && file !== '.git';

export function validateGreenfieldPlan(plan) {
  if (!validatePlanRecord(plan)) return { valid: false, errors: validatePlanRecord.errors };
  const errors = [];
  const contract = validateChangeContract(plan.contract);
  if (!contract.valid) errors.push(...contract.errors);
  if (plan.contract.lifecycle_state !== 'accepted') errors.push('Greenfield scaffolding requires an accepted Change Contract.');
  const contractDecisions = new Set(plan.contract.decisions.map(({ decision_id }) => decision_id));
  for (const decision of plan.stack_decisions) if (!contractDecisions.has(decision.decision_id)) errors.push(`Stack decision ${decision.decision_id} is not in the accepted contract.`);
  for (const file of Object.keys(plan.files)) if (!safePath(file)) errors.push(`Unsafe generated path: ${file}.`);
  for (const uncertainty of plan.uncertainties) try { routeUncertainty(uncertainty); } catch (error) { errors.push(error.message); }
  if (!plan.subtraction_ladder.retained.every((item) => plan.subtraction_ladder.considered.includes(item))) errors.push('Every retained mechanism must be present in the subtraction ladder.');
  return { valid: errors.length === 0, errors };
}

export async function scaffoldGreenfield(plan, targetPath, { checkBase = true } = {}) {
  const checked = validateGreenfieldPlan(plan); if (!checked.valid) throw new Error(`Greenfield plan validation failed: ${JSON.stringify(checked.errors)}`);
  if (typeof targetPath !== 'string' || !path.isAbsolute(targetPath)) throw new Error('Greenfield target must be an absolute directory.');
  const before = await profileProject(targetPath);
  if (before.target.git_dirty) throw new Error('Greenfield target must be clean before scaffolding.');
  if (checkBase && (await detectChangeContractDrift(plan.contract, targetPath)).drifted) throw new Error('Greenfield Change Contract base drift detected; re-profile and re-accept the contract.');
  for (const [file, contents] of Object.entries(plan.files)) {
    const destination = path.join(targetPath, file);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, contents, { encoding: 'utf8', flag: 'wx' });
  }
  const after = await profileProject(targetPath);
  return { plan_id: plan.plan_id, charter: plan.charter, routes: plan.uncertainties.map(routeUncertainty), profile_before: before, profile_after: after, files: Object.keys(plan.files).sort(), baseline: plan.baseline };
}
