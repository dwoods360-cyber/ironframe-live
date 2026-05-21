/**
 * Irontally policy validation for governed quarantine / hard-ban resets (ISO 27001 Annex A.5).
 * Evaluates operator rationale against Annex A.5 (Information Security Policy) expectations:
 * explanation of the error, identity verification narrative, and mitigation / corrective action.
 */

export const ISO_ANNEX_A5_GOVERNED_OVERRIDE_PROMPT_TEMPLATE = `You are Irontally Policy Engine (read-only).
Evaluate the operator's rationale for a GOVERNED QUARANTINE RESET against ISO/IEC 27001:2022 Annex A.5 — Information Security Policy.

Annex A.5 requires documented policy commitment and adherence. For this override, the rationale MUST demonstrate:
1) Explanation of the error or security event (what went wrong or why reset is needed).
2) Verification of identity / authority (who performed verification, or how legitimacy was established).
3) A mitigation or corrective step (what will be done to reduce recurrence or risk).

Rationale to evaluate:
---
{{RATIONALE}}
---

Respond with structured assessment only (machine-parseable):
- EXPLANATION: yes|no
- IDENTITY: yes|no
- MITIGATION: yes|no
- POLICY_MATCH_SCORE: 0-100
`;

const EXPLANATION_RE =
  /\b(error|breach|violation|false\s*positive|blocked|quarantine|incident|mistake|misconfiguration|root\s*cause|why\s+this|reason\s+for|due\s+to|because|triggered|occurred)\b/i;
const IDENTITY_RE =
  /\b(verified|verification|identity|authenticated|authorized\s+personnel|operator|credential|mfa|checked|confirmed|validated\s+identity|on\s+behalf\s+of)\b/i;
const MITIGATION_RE =
  /\b(mitigat|remediat|corrective|prevent|control|will\s+ensure|steps\s+taken|going\s+forward|patch|rollback|ticket|change\s+request|process\s+update)\b/i;

export type GovernedOverridePolicyResult = {
  isValidComplianceStatement: boolean;
  /** 0–100; Irontally "Policy Match" for hard-ban (offense_count >= 3) must meet threshold. */
  policyMatchScore: number;
  hasExplanation: boolean;
  hasIdentityVerification: boolean;
  hasMitigation: boolean;
};

const HARD_BAN_POLICY_MATCH_MIN = 85;

/**
 * Deterministic Irontally-style evaluation (prompt template documents intent; logic is rule-based for CI/repeatability).
 */
export function validateGovernedOverrideRationale(rationale: string): GovernedOverridePolicyResult {
  const t = rationale.trim();
  const hasExplanation = EXPLANATION_RE.test(t);
  const hasIdentityVerification = IDENTITY_RE.test(t);
  const hasMitigation = MITIGATION_RE.test(t);
  let policyMatchScore =
    (hasExplanation ? 28 : 0) + (hasIdentityVerification ? 28 : 0) + (hasMitigation ? 29 : 0);
  const wc = t.split(/\s+/).filter(Boolean).length;
  if (wc >= 35) policyMatchScore += 8;
  if (wc >= 55) policyMatchScore += 7;
  if (t.length >= 420) policyMatchScore += 5;
  if (wc < 28) policyMatchScore -= 18;
  policyMatchScore = Math.max(0, Math.min(100, policyMatchScore));
  const isValidComplianceStatement = hasExplanation && hasIdentityVerification && hasMitigation;
  return {
    isValidComplianceStatement,
    policyMatchScore,
    hasExplanation,
    hasIdentityVerification,
    hasMitigation,
  };
}

/** Hard-ban / strike-3 path: Irontally Policy Match score must clear threshold (Annex A.5 narrative already satisfied). */
export function hardBanRequiresPolicyMatch(policyResult: GovernedOverridePolicyResult): boolean {
  return (
    policyResult.isValidComplianceStatement && policyResult.policyMatchScore >= HARD_BAN_POLICY_MATCH_MIN
  );
}
