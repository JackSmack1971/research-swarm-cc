const pickCriteria = (capsule) => capsule.acceptance_criteria.map(({ criterion_id, requirement_ids, observable_proof, required_proof_kinds }) => ({ criterion_id, requirement_ids, observable_proof, ...(required_proof_kinds ? { required_proof_kinds } : {}) }));

export function executorContext(capsule, authorization) {
  return {
    task_id: capsule.task_id,
    objective: capsule.objective,
    acceptance_criteria: pickCriteria(capsule),
    decision_outcomes: capsule.decisions.map(({ decision_id, outcome }) => ({ decision_id, outcome })),
    non_goals: capsule.non_goals,
    code_anchors: capsule.code_anchors,
    checks: capsule.verification,
    risks: capsule.risks,
    stop_conditions: capsule.stop_conditions,
    execution_posture: { allowed_autonomy: authorization.allowed_autonomy, isolation: authorization.isolation, tool_posture: authorization.tool_posture, overall_risk: authorization.classification.overall_level }
  };
}

export function verifierContext({ capsule, authorization, executionEvent, changeIdentity }) {
  return {
    task_id: capsule.task_id,
    acceptance_criteria: pickCriteria(capsule),
    exact_change: { event_id: executionEvent.event_id, base_revision: executionEvent.base_revision, changed_files: executionEvent.file_changes, change_identity: changeIdentity },
    code_anchors: capsule.code_anchors,
    checks: capsule.verification,
    verification_posture: { verification_categories: authorization.verification_categories, proof_categories: authorization.proof_categories, profile_gates: authorization.profile_gates.map(({ profile_id, required_proof_kinds, verification_categories }) => ({ profile_id, required_proof_kinds, verification_categories })) },
    risk_posture: { overall_level: authorization.classification.overall_level, risks: capsule.risks }
  };
}

export function repairContext({ capsule, defects, authorization, attempt, changeIdentity }) {
  return {
    task_id: capsule.task_id,
    failed_criteria: defects,
    allowed_anchors: capsule.code_anchors,
    relevant_checks: capsule.verification,
    non_goals: capsule.non_goals,
    stop_conditions: capsule.stop_conditions,
    repair_posture: { attempt, max_attempts: 2, change_identity: changeIdentity, tool_posture: authorization.tool_posture }
  };
}
