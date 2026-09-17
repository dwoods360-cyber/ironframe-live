import { ThreatState } from "@prisma/client";
import { listCatalogTenantIds } from "@/app/lib/server/cronTenantScope";
import { withIronguardTenant } from "@/app/lib/server/ironguardSessionTenant";
import { dispatchIronlockQuarantineAutoEscalation } from "@/app/utils/ironlockQuarantineAutoEscalation";
import { transitionThreatStatus } from "@/src/services/threatStateService";

export type UpdateRiskStatusResult = { status: string };

/**
 * Programmatic ThreatEvent status change. Entering `MITIGATED` (quarantine) runs the Ironlock
 * auto-escalation path (Ironcast / Resend).
 */
export async function updateRiskStatus(
  riskId: string,
  nextStatus: string,
): Promise<UpdateRiskStatusResult> {
  if (nextStatus !== "MITIGATED") {
    throw new Error(`Unsupported risk status for updateRiskStatus: ${nextStatus}`);
  }

  const id = riskId.trim();
  let existing: {
    status: ThreatState;
    tenantCompanyId: bigint | null;
    tenantId: string;
  } | null = null;

  for (const tenantId of await listCatalogTenantIds()) {
    const row = await withIronguardTenant(tenantId, (tx) =>
      tx.threatEvent.findFirst({
        where: { id, tenantId },
        select: { status: true, tenantCompanyId: true, tenantId: true },
      }),
    );
    if (row) {
      existing = row;
      break;
    }
  }

  if (!existing) {
    throw new Error(`Risk not found: ${riskId}`);
  }
  if (existing.tenantCompanyId == null) {
    throw new Error(`Risk missing tenant company boundary: ${riskId}`);
  }

  const previousStatus = existing.status;

  await withIronguardTenant(existing.tenantId, async (tx) => {
    await transitionThreatStatus({
      threatId: riskId,
      newStatus: ThreatState.MITIGATED,
      actorUserId: "system-risk-update",
      eventType: "RISK_STATUS_UPDATED",
      tx,
    });
  });

  if (previousStatus !== ThreatState.MITIGATED) {
    await dispatchIronlockQuarantineAutoEscalation({
      threatId: riskId,
      tenantUuid: existing.tenantId,
      previousStatus,
    });
  }

  return { status: "MITIGATED" };
}
