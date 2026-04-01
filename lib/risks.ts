import prisma from "@/lib/prisma";
import { ThreatState } from "@prisma/client";
import { dispatchIronlockQuarantineAutoEscalation } from "@/app/utils/ironlockQuarantineAutoEscalation";

export type UpdateRiskStatusResult = { status: string };

/**
 * Programmatic ThreatEvent status change. Entering `QUARANTINED` runs the Ironlock
 * auto-escalation path (Ironcast / Resend).
 */
export async function updateRiskStatus(
  riskId: string,
  nextStatus: string,
): Promise<UpdateRiskStatusResult> {
  if (nextStatus !== "QUARANTINED") {
    throw new Error(`Unsupported risk status for updateRiskStatus: ${nextStatus}`);
  }

  const existing = await prisma.threatEvent.findUnique({
    where: { id: riskId },
    select: { status: true, tenantCompanyId: true },
  });
  if (!existing) {
    throw new Error(`Risk not found: ${riskId}`);
  }
  if (existing.tenantCompanyId == null) {
    throw new Error(`Risk missing tenant company boundary: ${riskId}`);
  }

  const company = await prisma.company.findUnique({
    where: { id: existing.tenantCompanyId },
    select: { tenantId: true },
  });
  if (!company) {
    throw new Error(`Company not found for risk: ${riskId}`);
  }

  const previousStatus = existing.status;

  await prisma.threatEvent.update({
    where: { id: riskId },
    data: { status: ThreatState.QUARANTINED },
  });

  if (previousStatus !== ThreatState.QUARANTINED) {
    await dispatchIronlockQuarantineAutoEscalation({
      threatId: riskId,
      tenantUuid: company.tenantId,
      previousStatus,
    });
  }

  return { status: "QUARANTINED" };
}
