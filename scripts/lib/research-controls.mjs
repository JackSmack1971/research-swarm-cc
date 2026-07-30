const MATERIALITY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };
const CONFIDENCE_RISK = { low: 3, medium: 2, high: 1 };

export const HARD_MAXIMA = Object.freeze({ maxWorkers: 8, maxSourcesPerWorker: 12, maxClaimsPerWorker: 15, maxCanonicalClaims: 40, maxVerificationTargets: 40, maxVerifierConcurrency: 8, maxGapFillWorkers: 2 });
export const DEPTH_DEFAULTS = Object.freeze({
  light: { maxWorkers: 2, maxSourcesPerWorker: 4, maxClaimsPerWorker: 5, maxCanonicalClaims: 8, maxVerificationTargets: 8, maxVerifierConcurrency: 2, maxGapFillWorkers: 1 },
  standard: { maxWorkers: 5, maxSourcesPerWorker: 8, maxClaimsPerWorker: 10, maxCanonicalClaims: 20, maxVerificationTargets: 20, maxVerifierConcurrency: 4, maxGapFillWorkers: 2 },
  deep: { maxWorkers: 8, maxSourcesPerWorker: 12, maxClaimsPerWorker: 15, maxCanonicalClaims: 40, maxVerificationTargets: 40, maxVerifierConcurrency: 8, maxGapFillWorkers: 2 }
});

export function boundedInteger(value, fallback, maximum) {
  const number = Number(value);
  return Number.isFinite(number) && Number.isInteger(number) && number > 0 ? Math.min(number, maximum) : fallback;
}

export function limitsFor(depth, input = {}) {
  const defaults = DEPTH_DEFAULTS[depth === 'auto' ? 'standard' : depth] ?? DEPTH_DEFAULTS.standard;
  return Object.fromEntries(Object.entries(HARD_MAXIMA).map(([key, maximum]) => [key, boundedInteger(input[key], defaults[key], maximum)]));
}

export function rankClaims(claims) {
  return [...claims].sort((left, right) => MATERIALITY_RANK[right.materiality] - MATERIALITY_RANK[left.materiality]
    || CONFIDENCE_RISK[right.confidence] - CONFIDENCE_RISK[left.confidence]
    || String(left.claim_id).localeCompare(String(right.claim_id)));
}

export function capClaims(claims, maximum) {
  const ranked = rankClaims(claims);
  return { admitted: ranked.slice(0, maximum), omitted: ranked.slice(maximum) };
}

export function mergeVerificationPolicy(userPolicy, plannerPolicy, depth) {
  if (depth === 'deep') return { policy: 'all-material', rationale: 'Deep research always verifies every admitted canonical claim.' };
  const rank = { none: 0, 'risk-based': 1, 'all-material': 2 };
  const policy = rank[plannerPolicy] > rank[userPolicy] ? plannerPolicy : userPolicy;
  return { policy, rationale: policy === userPolicy && policy === plannerPolicy ? 'User and planner selected the same policy.' : `Used the stronger of user (${userPolicy}) and planner (${plannerPolicy}) policy.` };
}

export function chunk(items, size) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));
}

export function escalationDecision({ depth, claims, conflicts, coverageGaps, sources, query = '' }) {
  const byId = new Map(claims.map((claim) => [claim.claim_id, claim]));
  const material = claims.filter((claim) => claim.materiality !== 'low');
  const conflictRisk = conflicts.some((conflict) => conflict.claim_ids.some((id) => ['critical', 'high'].includes(byId.get(id)?.materiality)));
  const severeGap = coverageGaps.some((gap) => ['critical', 'high'].includes(gap.severity) && gap.status !== 'resolved');
  const lowConfidence = material.length > 0 && material.filter((claim) => claim.confidence === 'low').length / material.length > .25;
  const sourceById = new Map(sources.map((source) => [source.source_id, source]));
  const missingPrimary = material.filter((claim) => ['critical', 'high'].includes(claim.materiality)).some((claim) => !claim.supporting_evidence.some(({ source_id }) => ['primary_data', 'official_record', 'standard', 'filing'].includes(sourceById.get(source_id)?.source_type)));
  const highStakes = /legal|medical|health|financial|investment|safety|clinical|regulat/i.test(`${query} ${claims.map((claim) => claim.statement).join(' ')}`);
  const reasons = [conflictRisk && 'critical or high-materiality conflict', severeGap && 'high-severity coverage gap', lowConfidence && 'more than 25% low-confidence material claims', missingPrimary && 'key claim lacks primary or official evidence', highStakes && 'new high-stakes scope'].filter(Boolean);
  const nextDepth = depth === 'light' ? 'standard' : depth === 'standard' ? 'deep' : 'deep';
  return { escalate: reasons.length > 0 && depth !== 'deep', depth: reasons.length ? nextDepth : depth, policy: reasons.length ? 'all-material' : null, reasons };
}
