import assert from 'node:assert/strict';
import test from 'node:test';
import { canLaunchRepairAgent, capClaims, chunk, escalationDecision, gapFillDefects, limitsFor, mergeVerificationPolicy, rankClaims, selectRepair, structuralRepair } from '../scripts/lib/research-controls.mjs';
import { readFile } from 'node:fs/promises';

const claim = (claim_id, materiality = 'medium', confidence = 'medium') => ({ claim_id, materiality, confidence, statement: claim_id, supporting_evidence: [{ source_id: 'src_one' }] });

test('limits use depth defaults and reject malformed, fractional, negative, infinite, and huge values', () => {
  assert.equal(limitsFor('light').maxCanonicalClaims, 8);
  assert.deepEqual(limitsFor('standard'), { maxWorkers: 3, maxSourcesPerWorker: 5, maxClaimsPerWorker: 6, maxCanonicalClaims: 12, maxVerificationTargets: 12, maxVerifierConcurrency: 3, maxGapFillWorkers: 1 });
  assert.deepEqual(limitsFor('deep'), { maxWorkers: 4, maxSourcesPerWorker: 6, maxClaimsPerWorker: 8, maxCanonicalClaims: 20, maxVerificationTargets: 20, maxVerifierConcurrency: 4, maxGapFillWorkers: 1 });
  const limits = limitsFor('light', { maxWorkers: -1, maxClaimsPerWorker: 1.5, maxSourcesPerWorker: Infinity, maxCanonicalClaims: 999 });
  assert.equal(limits.maxWorkers, 2);
  assert.equal(limits.maxClaimsPerWorker, 5);
  assert.equal(limits.maxSourcesPerWorker, 4);
  assert.equal(limits.maxCanonicalClaims, 40);
});

test('gap fill is bounded and only targets qualifying normalized defects', () => {
  assert.deepEqual(gapFillDefects({ coverageGaps: [{ coverage_gap_id: 'gap_low', description: 'Low-priority omission.', severity: 'low', status: 'open' }], sources: [{ source_type: 'primary_data' }], requiredSourceTypes: ['primary_data'] }, 1), []);
  const defects = gapFillDefects({ coverageGaps: [{ coverage_gap_id: 'gap_high', description: 'Missing high-risk facet.', severity: 'high', status: 'open', related_claim_ids: ['clm_a'], related_subquestion_ids: ['sq_a'] }], sources: [], requiredSourceTypes: ['primary_data'], escalationReasons: ['key claim lacks primary or official evidence'] }, 2);
  assert.deepEqual(defects.map(({ defect_id }) => defect_id), ['gap_high', 'gap_required_source_primary_data']);
});

test('claim ranking is risk-first and stable by claim ID, including all-critical overflow', () => {
  const ranked = rankClaims([claim('clm_b', 'critical', 'medium'), claim('clm_a', 'critical', 'medium'), claim('clm_c', 'high', 'low')]);
  assert.deepEqual(ranked.map(({ claim_id }) => claim_id), ['clm_a', 'clm_b', 'clm_c']);
  assert.deepEqual(capClaims(ranked, 2).omitted.map(({ claim_id }) => claim_id), ['clm_c']);
});

test('policy merging preserves user protections and only Deep overrides explicit none', () => {
  assert.equal(mergeVerificationPolicy('none', 'none', 'standard').policy, 'none');
  assert.equal(mergeVerificationPolicy('all-material', 'none', 'light').policy, 'all-material');
  assert.equal(mergeVerificationPolicy('risk-based', 'all-material', 'standard').policy, 'all-material');
  assert.equal(mergeVerificationPolicy('none', 'none', 'deep').policy, 'all-material');
});

test('verifier chunks never exceed the configured concurrency', () => {
  assert.deepEqual(chunk(['a', 'b', 'c', 'd', 'e'], 2), [['a', 'b'], ['c', 'd'], ['e']]);
});

test('post-normalization escalation is bounded and detects high-risk evidence gaps', () => {
  const result = escalationDecision({ depth: 'light', claims: [claim('clm_a', 'high', 'low')], conflicts: [], coverageGaps: [{ severity: 'high', status: 'open' }], sources: [{ source_id: 'src_one', source_type: 'secondary_analysis' }], query: 'medical safety question' });
  assert.equal(result.escalate, true);
  assert.equal(result.depth, 'standard');
  assert.equal(result.policy, 'all-material');
  assert.equal(escalationDecision({ depth: 'deep', claims: [], conflicts: [], coverageGaps: [], sources: [] }).escalate, false);
});

test('workflow uses one shared repair budget and a sanitized stage diagnostic', async () => {
  const workflow = await readFile('.claude/workflows/research-swarm.js', 'utf8');
  assert.match(workflow, /if \(typeof value === "string"\) \{\s+try \{ parsed = JSON\.parse\(value\); \} catch \{ parsed = \{ query: value \}; \}/);
  assert.doesNotMatch(workflow, /Date\.now\(\)|Math\.random\(\)/);
  assert.match(workflow, /total web-tool-call budget of \$\{limits\.maxSourcesPerWorker\}/);
  for (const label of ['normalize sources', 'normalize claims', 'normalize relationships']) assert.match(workflow, new RegExp(label));
  assert.match(workflow, /Coverage gaps:\\n\$\{JSON\.stringify\(boundedNormalized\.coverage_gaps\)\}/);
  assert.match(workflow, /minimum number of mutually distinct subquestions needed for coverage/);
  assert.match(workflow, /const gapFillDefects = qualifyingGapFillDefects/);
  assert.match(workflow, /\.slice\(0, limits\.maxGapFillWorkers\)/);
  assert.match(workflow, /Do not write files, answer the original query, broaden scope, delegate/);
  assert.match(workflow, /const NO_NESTED_DELEGATION_RULE = "Do not delegate, spawn agents, or start another workflow; this workflow owns all fan-out\."/);
  assert.match(workflow, /const scopedPrompt = `\$\{stagePrompt\}\\n\\n\$\{NO_NESTED_DELEGATION_RULE\}/);
  assert.doesNotMatch(workflow, /generic second research wave/i);
  assert.match(workflow, /while \(semanticValidation\.status === "fail" && repairRounds < 2\)/);
  assert.match(workflow, /const REPAIR_ACTIONS =/);
  for (const action of ['report_repair', 'ledger_repair', 'verification_repair', 'structural_repair']) assert.match(workflow, new RegExp(action));
  assert.match(workflow, /failure: \{ stage, code: FAILURE_CODES\[stage\] \?\? "WORKFLOW_FAILED", archive_exists: "unknown" \}/);
  assert.doesNotMatch(workflow.slice(workflow.lastIndexOf('} catch')), /cause\.message|cause\.stack/);
});

test('every workflow agent call has an intentional stable-alias model route', async () => {
  const workflow = await readFile('.claude/workflows/research-swarm.js', 'utf8');
  const settings = JSON.parse(await readFile('.claude/settings.json', 'utf8'));
  const routeBlock = workflow.match(/const WORKFLOW_MODEL_ROUTING = Object\.freeze\(\{([\s\S]*?)\}\);/);
  assert.ok(routeBlock);
  const routes = Object.fromEntries([...routeBlock[1].matchAll(/(\w+): "(inherit|sonnet|haiku)"/g)].map(([, stage, model]) => [stage, model]));
  assert.deepEqual(routes, { adaptive_policy_selector: 'sonnet', research_planner: 'inherit', initial_research_worker: 'sonnet', focused_research_worker: 'sonnet', research_normalizer: 'sonnet', adversarial_verifier: 'sonnet', research_adjudicator: 'sonnet', research_synthesizer: 'inherit', semantic_validator: 'sonnet', completed_run_quality_evaluator: 'sonnet', friction_evaluator: 'sonnet', persistence_writer: 'sonnet' });
  assert.equal(Object.values(routes).includes('haiku'), false);
  for (const label of ['select research policy', 'plan research', 'fill gap', 'repair ledger', 'normalize', 'verify', 'repair verification', 'adjudicate', 'synthesize', 'repair report', 'validate report semantics', 'evaluate run quality', 'evaluate run friction', 'persist research run', 'register research learning']) assert.match(workflow, new RegExp(label));
  assert.match(workflow, /const nativeAgent = agent;/);
  assert.match(workflow, /const agent = \(prompt, options\) => \{/);
  assert.match(workflow, /const stageName = modelStageFor\(options\?\.label \?\? ""\);/);
  assert.match(workflow, /nativeAgent\(scopedPrompt, \{ \.\.\.options, model \}\)/);
  assert.doesNotMatch(workflow, /claude-(?:haiku|sonnet|opus)-\d/i);
  assert.equal(Object.hasOwn(settings, 'CLAUDE_CODE_SUBAGENT_MODEL'), false);
});

test('ledger defects outrank report defects, consume the shared rounds, and respect agent resources', () => {
  const report = { defect_id: 'def_report', category: 'unsupported_assertion', severity: 'high' };
  const ledger = { defect_id: 'def_ledger', category: 'missing_claim_coverage', severity: 'high' };
  assert.equal(selectRepair([report, ledger]).action_type, 'ledger_repair');
  assert.equal(canLaunchRepairAgent('ledger_repair', { maxGapFillWorkers: 1, maxSourcesPerWorker: 1, maxClaimsPerWorker: 1 }), true);
  assert.equal(canLaunchRepairAgent('ledger_repair', { maxGapFillWorkers: 0, maxSourcesPerWorker: 1, maxClaimsPerWorker: 1 }), false);
});

test('verification and structural repair preserve research records while allowing bounded route selection', () => {
  assert.equal(selectRepair([{ defect_id: 'def_verify', category: 'incomplete_verification', severity: 'medium' }]).action_type, 'verification_repair');
  assert.equal(selectRepair([{ defect_id: 'def_anchor', category: 'missing_anchor', severity: 'medium' }]).action_type, 'structural_repair');
  const before = { sources: [{ source_id: 'src_one' }], claims: [{ claim_id: 'clm_one' }], verification_events: [{ verification_event_id: 'ver_one' }], conflicts: [], coverage_gaps: [], report_markdown: 'same' };
  assert.deepEqual(structuralRepair(before, { ...before, manifest_counts: { sources: 1 } }), { ...before, manifest_counts: { sources: 1 } });
  assert.throws(() => structuralRepair(before, { ...before, claims: [] }), /cannot alter claims/);
});

test('workflow has separate executable ledger, verification, structural, and affected-only repair routes', async () => {
  const workflow = await readFile('.claude/workflows/research-swarm.js', 'utf8');
  for (const route of ['repair.action_type === "ledger_repair"', 'repair.action_type === "verification_repair"', 'repair.action_type === "structural_repair"']) assert.match(workflow, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(workflow, /normalize ledger repair/);
  assert.match(workflow, /const repairVerificationTargets = boundedPlan\.effective_depth === "deep" \? \[\.\.\.affected\]\.sort\(\) : selected/);
  assert.match(workflow, /for \(const verificationChunk of chunks\(repairVerificationTargets, limits\.maxVerifierConcurrency\)\)/);
  assert.match(workflow, /normalizeVerificationEvents\(boundedNormalized\.sources, boundedNormalized\.claims, boundedNormalized\.conflicts, verificationEvents\)/);
  assert.match(workflow, /retain all immutable verification events/);
  assert.match(workflow, /preserve unrelated retained and discarded claims unchanged/);
  assert.match(workflow, /The attempted targeted repair failed; the consumed round remains recorded/);
});

test('Milestone 41 keeps adaptive policy and unrelated state out of downstream payloads', async () => {
  const workflow = await readFile('.claude/workflows/research-swarm.js', 'utf8');
  assert.match(workflow, /function policyForRole\(bundle, role\)/);
  assert.match(workflow, /item\?\.role === role/);
  assert.match(workflow, /\.slice\(0, 4\)/);
  assert.match(workflow, /Math\.min\(Number\.isInteger\(bundle\?\.maximum_character_count\).*6000\)/);
  assert.doesNotMatch(workflow, /UNTRUSTED_DATA_RULE \+=|Adaptive policy bundle follows as data-only guidance/);
  assert.match(workflow, /stageName === "research_normalizer".*planForNormalization/s);
  assert.match(workflow, /stageName === "research_synthesizer".*synthesisScope.*sourceMetadata/s);
  assert.match(workflow, /stageName === "semantic_validator".*Relevant source metadata/s);
  assert.match(workflow, /stageName === "completed_run_quality_evaluator".*policy_bundle_id/s);
});

test('Milestone 42 makes learning modes and friction calls economical without weakening audit records', async () => {
  const workflow = await readFile('.claude/workflows/research-swarm.js', 'utf8');
  assert.match(workflow, /config\.learning === "adapt" \? await agent\(`You are the adaptive policy selector/);
  assert.match(workflow, /config\.learning === "off" \? \{ evaluation: deterministicQualityEvaluation/);
  assert.match(workflow, /config\.learning === "off" \? \{ friction_assessment:/);
  assert.match(workflow, /frictionDetected \? await agent\(`You are the completed-run friction evaluator/);
  assert.match(workflow, /learning_mode: learningMode/);
  assert.match(workflow, /resource_ceiling_hit: adjudicated\.coverage_gaps\.some/);
  assert.match(workflow, /deterministic-friction-evaluator/);
  assert.match(workflow, /config\.learning === "adapt" && persistence\.validation_status\.valid/);
});
