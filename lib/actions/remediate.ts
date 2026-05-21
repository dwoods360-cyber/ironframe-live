"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { CANONICAL_MEDSHIELD_ALE_BASELINE_CENTS } from "@/lib/simulation/remediation";
import { sendRemediationStakeholderBroadcast } from "@/lib/simulation/remediationBroadcast";
import prisma from "@/lib/prisma";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import type { RemediationImpactReport } from "@/app/types/remediationReceipt";
import { SIMULATION_CONFIG_ID } from "@/app/utils/simulationConfigConstants";
import { resolveIntegrityLedgerAuthorizedLabel } from "@/app/utils/serverAuth";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import { updateThreatWithIntegrity } from "@/src/services/threatStateService";

const MEDSHIELD_ID = TENANT_UUIDS.medshield;

export type { RemediationImpactReport } from "@/app/types/remediationReceipt";

function mergeLabRemediation(ingestionDetails: string | null): string {
  let parsed: Record<string, unknown> = {};
  if (ingestionDetails?.trim()) {
    try {
      parsed = JSON.parse(ingestionDetails) as Record<string, unknown>;
    } catch {
      parsed = { _raw: ingestionDetails };
    }
  }
  return JSON.stringify({
    ...parsed,
    labRemediation: {
      status: "REMEDIATED",
      at: new Date().toISOString(),
    },
  });
}

/**
 * Optional: mark simulation / synthetic-loss adjacent threat rows as lab-remediated (JSON tag only).
 * Matches `SIM_LOSS` in payload, or synthetic-employee simulation rows.
 */
async function tagSimulationLossEventsAsRemediated(tx: Prisma.TransactionClient): Promise<number> {
  const candidates = await tx.threatEvent.findMany({
    where: {
      OR: [
        { ingestionDetails: { contains: "SIM_LOSS", mode: "insensitive" } },
        { ingestionDetails: { contains: "syntheticEmployeeId", mode: "insensitive" } },
      ],
    },
    select: { id: true, ingestionDetails: true },
    take: 500,
  });

  let n = 0;
  for (const row of candidates) {
    await updateThreatWithIntegrity({
      threatId: row.id,
      changes: { ingestionDetails: mergeLabRemediation(row.ingestionDetails) },
      actorUserId: "system-remediation",
      eventType: "LAB_REMEDIATION_TAGGED",
      tx,
    });
    n += 1;
  }
  return n;
}

/**
 * Tier 3 **Restore system integrity**: reset synthetic shadow damage, restore Medshield ALE baseline
 * (canonical `Tenant.ale_baseline` — there is no separate `ALE_Baselines` table in this schema),
 * and optionally tag prior simulation threats as remediated in `ingestionDetails`.
 */
export async function restoreSystemIntegrityAction(): Promise<
  | {
      ok: true;
      impactReport: RemediationImpactReport;
      clearedLossCents: string;
      taggedThreatEvents: number;
    }
  | { ok: false; error: string }
> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const [agg, attackedCount, topAttackedByValue] = await Promise.all([
        tx.syntheticEmployee.aggregate({
          _sum: { totalLossIncurred: true },
        }),
        tx.syntheticEmployee.count({
          where: { lastAttackedAt: { not: null } },
        }),
        tx.syntheticEmployee.findFirst({
          where: { lastAttackedAt: { not: null } },
          orderBy: { monetaryValue: "desc" },
          select: { name: true },
        }),
      ]);

      const recoveredSum = agg._sum.totalLossIncurred ?? 0n;
      const impactReport: RemediationImpactReport = {
        totalRecoveredCents: recoveredSum.toString(),
        affectedCount: attackedCount,
        highestValueTarget: topAttackedByValue?.name ?? null,
        timestamp: new Date().toISOString(),
      };

      await tx.syntheticEmployee.updateMany({
        data: {
          lastAttackedAt: null,
          totalLossIncurred: 0n,
          isHardened: false,
        },
      });

      await tx.tenant.update({
        where: { id: MEDSHIELD_ID },
        data: { ale_baseline: CANONICAL_MEDSHIELD_ALE_BASELINE_CENTS },
      });

      const taggedThreatEvents = await tagSimulationLossEventsAsRemediated(tx);

      return { impactReport, clearedLossCents: recoveredSum, taggedThreatEvents };
    });

    try {
      const { userId, displayName } = await resolveIntegrityLedgerAuthorizedLabel();
      await auditLogCreateLoose({
        data: {
          action: "LAB_RESTORATION_SUCCESS",
          justification: `[${displayName}] Lab integrity restore: recovered ${result.clearedLossCents} cents (simulated) across ${result.impactReport.affectedCount} personas; ${result.taggedThreatEvents} threat row(s) tagged remediated.`,
          operatorId: userId,
          threatId: null,
          isSimulation: true,
        },
      });
    } catch (auditErr) {
      console.error("[restoreSystemIntegrityAction] restoration audit", auditErr);
    }

    revalidatePath("/integrity");
    revalidatePath("/medshield");

    const cfg = await prisma.simulationConfig.findUnique({
      where: { id: SIMULATION_CONFIG_ID },
      select: { automatedUpdatesEnabled: true },
    });
    if (cfg?.automatedUpdatesEnabled === true) {
      await sendRemediationStakeholderBroadcast(result.impactReport);
    }

    return {
      ok: true,
      impactReport: result.impactReport,
      clearedLossCents: result.clearedLossCents.toString(),
      taggedThreatEvents: result.taggedThreatEvents,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Remediation failed";
    console.error("[restoreSystemIntegrityAction]", e);
    return { ok: false, error: message };
  }
}
