import type { PrismaClient } from "@prisma/client";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";

/** Canonical Medshield `Tenant.ale_baseline` from seed (USD cents) — $11.1M at 1¢ resolution. */
export const CANONICAL_MEDSHIELD_ALE_BASELINE_CENTS = 1_110_000_000n;

const MEDSHIELD_ID = TENANT_UUIDS.medshield;

/** Sum of `SyntheticEmployee.totalLossIncurred` (lab-wide simulated loss pool). */
export async function sumSyntheticTotalLossCents(prisma: PrismaClient): Promise<bigint> {
  const agg = await prisma.syntheticEmployee.aggregate({
    _sum: { totalLossIncurred: true },
  });
  return agg._sum.totalLossIncurred ?? 0n;
}

export type RemediationRecoverResult = {
  recoveredCents: bigint;
  previousAleCents: bigint;
  newAleCents: bigint;
};

/**
 * Blue-team recovery: add **100%** of recorded synthetic losses back to Medshield ALE baseline,
 * then clear shadow attack counters (pristine directory). Use when simulation drains baseline capital.
 */
export async function remediateMedshieldFromSyntheticLosses(
  prisma: PrismaClient,
): Promise<RemediationRecoverResult> {
  const recovered = await sumSyntheticTotalLossCents(prisma);
  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.findUniqueOrThrow({
      where: { id: MEDSHIELD_ID },
      select: { ale_baseline: true },
    });
    const previous = tenant.ale_baseline;
    const newAle = previous + recovered;

    await tx.tenant.update({
      where: { id: MEDSHIELD_ID },
      data: { ale_baseline: newAle },
    });

    await tx.syntheticEmployee.updateMany({
      data: {
        lastAttackedAt: null,
        totalLossIncurred: 0n,
      },
    });

    return {
      recoveredCents: recovered,
      previousAleCents: previous,
      newAleCents: newAle,
    };
  });
}

export type PristineRestoreResult = {
  /** Sum of losses cleared (informational). */
  clearedLossCents: bigint;
};

/**
 * Hard **RESTORE**: Medshield ALE baseline reset to canonical seed value; all synthetic
 * `lastAttackedAt` cleared and `totalLossIncurred` zeroed (Tier 3 lab pristine).
 */
export async function restoreMedshieldPristineLabState(
  prisma: PrismaClient,
): Promise<PristineRestoreResult> {
  const clearedLossCents = await sumSyntheticTotalLossCents(prisma);
  await prisma.$transaction([
    prisma.tenant.update({
      where: { id: MEDSHIELD_ID },
      data: { ale_baseline: CANONICAL_MEDSHIELD_ALE_BASELINE_CENTS },
    }),
    prisma.syntheticEmployee.updateMany({
      data: {
        lastAttackedAt: null,
        totalLossIncurred: 0n,
        isHardened: false,
      },
    }),
  ]);
  return { clearedLossCents };
}
