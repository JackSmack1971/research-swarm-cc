import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../../engineering/schemas/engineering-benchmark.schema.json' with { type: 'json' };

const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addFormat('date-time', { type: 'string', validate: (value) => !Number.isNaN(Date.parse(value)) });
const validate = ajv.compile(schema);

export function validateEngineeringBenchmark(record) {
  if (!validate(record)) return { valid: false, errors: validate.errors };
  const taskIds = new Set(record.suite.tasks.map(({ task_id }) => task_id));
  const results = new Set(record.results.map(({ task_id }) => task_id));
  if (taskIds.size !== record.suite.tasks.length || results.size !== record.results.length || [...results].some((id) => !taskIds.has(id))) return { valid: false, errors: ['Suite task IDs and result task IDs must be unique and aligned.'] };
  if (record.results.some(({ acceptance }) => acceptance.passed > acceptance.total)) return { valid: false, errors: ['Acceptance passes cannot exceed total criteria.'] };
  if (record.results.some(({ acceptance }) => acceptance.first_pass && acceptance.passed !== acceptance.total)) return { valid: false, errors: ['First-pass success requires every criterion to pass.'] };
  return { valid: true, errors: [] };
}

const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const sum = (values) => values.reduce((total, value) => total + value, 0);
export function collectEngineeringBenchmark(record) {
  const checked = validateEngineeringBenchmark(record); if (!checked.valid) throw new Error(`Engineering benchmark validation failed: ${JSON.stringify(checked.errors)}`);
  const results = record.results;
  return { run_id: record.run_id, arm: record.arm, suite_id: record.suite.suite_id, tasks_recorded: results.length, acceptance: { passed: sum(results.map((item) => item.acceptance.passed)), total: sum(results.map((item) => item.acceptance.total)), first_pass_successes: results.filter((item) => item.acceptance.first_pass).length }, repair_rounds: sum(results.map((item) => item.repair_rounds)), human_attention_events: sum(results.map((item) => item.human_attention.length)), regressions: results.flatMap((item) => item.regressions.map((regression) => `${item.task_id}:${regression}`)), failed_safety_gates: results.flatMap((item) => item.safety_gates.filter(({ status }) => status === 'failed').map(({ gate }) => `${item.task_id}:${gate}`)), complexity_delta: Object.fromEntries(['dependencies', 'services', 'configuration', 'public_apis', 'abstractions'].map((key) => [key, sum(results.map((item) => item.complexity_delta[key]))])), telemetry: Object.fromEntries(['tokens', 'milliseconds'].map((key) => [key, average(results.map((item) => item.telemetry[key]).filter((value) => value !== null))])), context_cost: Object.fromEntries(['tokens', 'milliseconds'].map((key) => [key, average(results.map((item) => item.context_cost[key]).filter((value) => value !== null))])), unavailable_telemetry: ['tokens', 'milliseconds'].filter((key) => results.some((item) => item.telemetry[key] === null || item.context_cost[key] === null)) };
}

export function compareEngineeringBenchmarks(baseline, candidate) {
  const left = collectEngineeringBenchmark(baseline); const right = collectEngineeringBenchmark(candidate);
  if (left.arm !== 'plain_claude' || right.arm !== 'candidate') throw new Error('Benchmark comparison requires a plain-Claude baseline and candidate run.');
  if (left.suite_id !== right.suite_id) throw new Error('Benchmark comparison requires the same suite.');
  const delta = (key) => right[key] - left[key];
  const acceptanceRate = (item) => item.acceptance.total ? item.acceptance.passed / item.acceptance.total : 0;
  return { baseline: left, candidate: right, deltas: { acceptance_rate: acceptanceRate(right) - acceptanceRate(left), first_pass_successes: right.acceptance.first_pass_successes - left.acceptance.first_pass_successes, repair_rounds: delta('repair_rounds'), human_attention_events: delta('human_attention_events') }, safety_regressions: [...new Set([...right.failed_safety_gates, ...right.regressions].filter((item) => ![...left.failed_safety_gates, ...left.regressions].includes(item)))], unavailable_telemetry: [...new Set([...left.unavailable_telemetry, ...right.unavailable_telemetry])] };
}
