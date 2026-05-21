/**
 * Agent 3 (Irontrust) — deterministic financial math for GRC Gold (Postgres ledger).
 * All amounts are integer cents (`BigInt`). governed_impact = base × multiplier / 100 at DB level.
 */

import {
  GOVERNANCE_IMPACT_MULTIPLIER_DEFENSE_BPS,
  GOVERNANCE_IMPACT_MULTIPLIER_UNITY_BPS,
} from "@/lib/constants/governanceMath";

export const IRONTRUST_DEFAULT_ALE_BASELINE_CENTS = 50_000_000n;

export type SentinelAleComputation = {
  baseImpactCents: bigint;
  governanceImpactMultiplierBps: bigint;
  governedImpactCents: bigint;
  isDefenseIndustry: boolean;
  formulaExplanation: string;
};

/**
 * Pure BigInt: governedImpactCents = (baseImpactCents * multiplierBps) / 100.
 */
export function computeSentinelFinancialRiskCents(input: {
  aleBaselineCents: bigint;
  industryTrimmed: string;
}): SentinelAleComputation {
  const base =
    input.aleBaselineCents > 0n ? input.aleBaselineCents : IRONTRUST_DEFAULT_ALE_BASELINE_CENTS;
  const isDefense = input.industryTrimmed === "Defense";
  const mult = isDefense ? GOVERNANCE_IMPACT_MULTIPLIER_DEFENSE_BPS : GOVERNANCE_IMPACT_MULTIPLIER_UNITY_BPS;
  const governed = (base * mult) / GOVERNANCE_IMPACT_MULTIPLIER_UNITY_BPS;
  const formulaExplanation = isDefense
    ? `Agent 3 (Irontrust) BigInt: governed_cents = (base_impact_cents * ${mult}n) / ${GOVERNANCE_IMPACT_MULTIPLIER_UNITY_BPS}n — matches Postgres generated column governed_impact (Defense 1.60×).`
    : `Agent 3 (Irontrust) BigInt: governed_cents = (base_impact_cents * ${GOVERNANCE_IMPACT_MULTIPLIER_UNITY_BPS}n) / ${GOVERNANCE_IMPACT_MULTIPLIER_UNITY_BPS}n (unity multiplier).`;
  return {
    baseImpactCents: base,
    governanceImpactMultiplierBps: mult,
    governedImpactCents: governed,
    isDefenseIndustry: isDefense,
    formulaExplanation,
  };
}

/** @deprecated Use computeSentinelFinancialRiskCents fields baseImpactCents / governedImpactCents */
export const IRONTRUST_DEFENSE_MULTIPLIER_NUM = 16n;
/** @deprecated Use GOVERNANCE_IMPACT_MULTIPLIER_UNITY_BPS */
export const IRONTRUST_DEFENSE_MULTIPLIER_DEN = 10n;
