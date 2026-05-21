/**
 * Executive Board Report — Operational Readiness scoring (connection health, VIP-weighted attack
 * penalties, VIP exposure overlay, restoration cadence).
 */

import prisma from "@/lib/prisma";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import { SIMULATION_CONFIG_ID } from "@/app/utils/simulationConfigConstants";

/** Standard (clearance 1–4) successful-sim penalty per affected persona. */
export const STANDARD_ATTACK_READINESS_PENALTY = 5;
/** VIP (clearance 5) successful-sim penalty per affected persona (double standard). */
export const VIP_ATTACK_READINESS_PENALTY = 10;
/** Additional flat penalty while any Level-5 persona has material loss (until lab restore clears it). */
export const VIP_EXPOSURE_PERSISTENT_PENALTY = 15;
/** Readiness uplift per hardened Level-5 persona (VIP invest-in-hardening). */
export const VIP_HARDENING_READINESS_POINTS_PER_TARGET = 2;
/** Cyber insurance baseline for neutral posture (USD cents). */
export const THEORETICAL_BASE_PREMIUM_CENTS = 10_000_000n;
/** Deductible floor per breach (USD cents). */
export const CYBER_DEDUCTIBLE_FLOOR_CENTS = 2_500_000n;

export type OperationalReadinessInput = {
  hasEnabledWebhookWithoutRecentSuccess: boolean;
  failedConnectionTestsLast7Days: number;
  successfulRestorationsLast30Days: number;
  /** Clearance 1–4 personas with simulation touch or non-zero simulated loss (successful attack surface). */
  successfulAttackStandardCount: number;
  /** Clearance 5 personas with simulation touch or non-zero simulated loss. */
  successfulAttackVipCount: number;
  /** True if any Level-5 persona has `totalLossIncurred > 0` (VIP material breach → persistent exposure penalty). */
  hasVipMaterialBreach: boolean;
  /** Level-5 personas with `isHardened` (lab VIP hardening investment). */
  hardenedVipCount: number;
};

export type OperationalReadinessBand = "EXCELLENT" | "STABLE" | "WATCH" | "CRITICAL";

export type OperationalReadinessResult = {
  score: number;
  maxScore: 100;
  band: OperationalReadinessBand;
  readinessRating: string;
  breakdown: {
    base: number;
    staleWebhookPenalty: number;
    failedTestPenalty: number;
    attackPenaltyStandard: number;
    attackPenaltyVip: number;
    vipExposurePersistent: number;
    restorationBonus: number;
    vipHardeningBonus: number;
  };
  /** Priority-1 UX: persistent VIP material breach active (gauge pulse, etc.). */
  hasPriorityOneVipExposure: boolean;
};

export type PremiumProjectionInput = {
  readinessScore: number;
  hardenedVipCount: number;
  hasVipMaterialBreach: boolean;
};

export type PremiumProjectionResult = {
  premiumCents: bigint;
  basePremiumCents: bigint;
  multiplierPercent: number;
};

export type DeductibleProjectionResult = {
  deductibleCents: bigint;
  /** Company-retained amount before insurance recovery (same as deductible). */
  outOfPocketExposureCents: bigint;
};

function bandFromScore(score: number): OperationalReadinessBand {
  if (score >= 90) return "EXCELLENT";
  if (score >= 75) return "STABLE";
  if (score >= 60) return "WATCH";
  return "CRITICAL";
}

/**
 * Base 100; connection-health penalties; clearance-weighted attack penalties; VIP exposure overlay;
 * restoration bonus. Score is floored at 0 and capped at 100.
 */
export function calculateReadinessScore(input: OperationalReadinessInput): OperationalReadinessResult {
  const base = 100;
  const staleWebhookPenalty = input.hasEnabledWebhookWithoutRecentSuccess ? 15 : 0;
  const failedTestPenalty = input.failedConnectionTestsLast7Days * 10;

  const attackPenaltyStandard = input.successfulAttackStandardCount * STANDARD_ATTACK_READINESS_PENALTY;
  const attackPenaltyVip = input.successfulAttackVipCount * VIP_ATTACK_READINESS_PENALTY;
  const vipExposurePersistent = input.hasVipMaterialBreach ? VIP_EXPOSURE_PERSISTENT_PENALTY : 0;

  const afterPenalties =
    base -
    staleWebhookPenalty -
    failedTestPenalty -
    attackPenaltyStandard -
    attackPenaltyVip -
    vipExposurePersistent;

  const restorationUpliftRequested = input.successfulRestorationsLast30Days * 5;
  const restorationBonus = Math.min(restorationUpliftRequested, Math.max(0, 100 - afterPenalties));
  const hardenedVipCount = Math.max(0, Math.floor(input.hardenedVipCount));
  const vipHardeningBonus = hardenedVipCount * VIP_HARDENING_READINESS_POINTS_PER_TARGET;
  const afterRestoration = afterPenalties + restorationBonus;
  const score = Math.max(0, Math.min(100, afterRestoration + vipHardeningBonus));
  const band = bandFromScore(score);
  const readinessRating = `${score}/100 — ${band}`;

  return {
    score,
    maxScore: 100,
    band,
    readinessRating,
    hasPriorityOneVipExposure: input.hasVipMaterialBreach,
    breakdown: {
      base,
      staleWebhookPenalty: -staleWebhookPenalty,
      failedTestPenalty: -failedTestPenalty,
      attackPenaltyStandard: -attackPenaltyStandard,
      attackPenaltyVip: -attackPenaltyVip,
      vipExposurePersistent: -vipExposurePersistent,
      restorationBonus,
      vipHardeningBonus,
    },
  };
}

/** @deprecated Use `calculateReadinessScore` (VIP-weighted readiness). */
export const computeOperationalReadinessScore = calculateReadinessScore;

/** Integer-percent premium model (all cents as BigInt). */
export function calculateInsurancePremiumCents(input: PremiumProjectionInput): PremiumProjectionResult {
  const readinessScore = Math.max(0, Math.min(100, Math.round(Number(input.readinessScore))));
  const hardenedVipCount = Math.max(0, Math.floor(Number(input.hardenedVipCount)));

  const readinessPenaltyPercent = (100 - readinessScore) * 2;
  const hardeningDiscountPercent = hardenedVipCount * 5;
  const vipEmergencyLoadingPercent = input.hasVipMaterialBreach ? 25 : 0;

  const rawMultiplierPercent =
    100 + readinessPenaltyPercent - hardeningDiscountPercent + vipEmergencyLoadingPercent;
  const multiplierPercent = Math.max(0, rawMultiplierPercent);
  const premiumCents = (THEORETICAL_BASE_PREMIUM_CENTS * BigInt(multiplierPercent)) / 100n;
  return {
    premiumCents,
    basePremiumCents: THEORETICAL_BASE_PREMIUM_CENTS,
    multiplierPercent,
  };
}

/** Deductible model: max(10% of monthly bleed, $25,000). */
export function calculateOutOfPocketExposure(simulatedMonthlyBleedCents: bigint): DeductibleProjectionResult {
  const bleed = simulatedMonthlyBleedCents > 0n ? simulatedMonthlyBleedCents : 0n;
  const tenPercent = bleed / 10n;
  const deductibleCents = tenPercent > CYBER_DEDUCTIBLE_FLOOR_CENTS ? tenPercent : CYBER_DEDUCTIBLE_FLOOR_CENTS;
  return {
    deductibleCents,
    outOfPocketExposureCents: deductibleCents,
  };
}

const READINESS_HISTORICAL_AUDIT_OPERATOR = "READINESS_HISTORICAL_TRACKER";
type SimulationConfigHistoricalLowRow = {
  historicalLowestScore: number;
  historicalLowestRecordedAt: Date | null;
};

/**
 * After each readiness calculation: seeds baseline on first observation, then persists a new
 * global minimum (and audit) when the current score is strictly lower than `historicalLowestScore`.
 */
export async function recordReadinessHistoricalLowIfNeeded(currentScore: number): Promise<void> {
  const score = Math.max(0, Math.min(100, Math.round(Number(currentScore))));

  const row = (await prisma.simulationConfig.findUnique({
    where: { id: SIMULATION_CONFIG_ID },
    select: {
      historicalLowestScore: true,
      historicalLowestRecordedAt: true,
    },
  } as any)) as SimulationConfigHistoricalLowRow | null;

  if (row == null) {
    await prisma.simulationConfig.create({
      data: ({
        id: SIMULATION_CONFIG_ID,
        automatedUpdatesEnabled: false,
        targetReadinessScore: 90,
        isCertified: false,
        certifiedAt: null,
        certificateStatus: "IN_PROGRESS",
        certificateIssuedAt: null,
        historicalLowestScore: score,
        historicalLowestRecordedAt: new Date(),
      } as any),
    });
    return;
  }

  if (row.historicalLowestRecordedAt == null) {
    await prisma.simulationConfig.update({
      where: { id: SIMULATION_CONFIG_ID },
      data: ({
        historicalLowestScore: score,
        historicalLowestRecordedAt: new Date(),
      } as any),
    });
    return;
  }

  if (score < row.historicalLowestScore) {
    await prisma.$transaction([
      prisma.simulationConfig.update({
        where: { id: SIMULATION_CONFIG_ID },
        data: ({
          historicalLowestScore: score,
          historicalLowestRecordedAt: new Date(),
        } as any),
      }),
      auditLogCreateLoose({
        data: {
          action: "READINESS_HISTORICAL_LOW",
          justification: `New Historical Vulnerability Low reached: ${score}`,
          operatorId: READINESS_HISTORICAL_AUDIT_OPERATOR,
          threatId: null,
          isSimulation: true,
        },
      }),
    ]);
  }
}
