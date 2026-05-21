import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { OPERATIONAL_DEFICIENCY_REPORT } from "@/app/lib/opsupport/operationalDeficiencyQueue";

/**
 * When a threat is promoted from the deficiency queue, close the open OPERATIONAL_DEFICIENCY_REPORT row
 * so `/api/opsupport/deficiency-queue` no longer counts it (same as manual resolve).
 */
export async function markOperationalDeficiencyReportPromotedToThreat(
  tenantUuid: string,
  deficiencyReportId: string,
  threatId: string,
): Promise<void> {
  const rid = deficiencyReportId.trim();
  if (!rid || !tenantUuid.trim()) return;

  const rows = await prisma.simulationDiagnosticLog.findMany({
    where: {
      tenantUuid: tenantUuid.trim(),
      action: OPERATIONAL_DEFICIENCY_REPORT,
      payload: { path: ["reportId"], equals: rid },
    },
    select: { id: true, payload: true },
  });

  const now = new Date();
  for (const r of rows) {
    const base =
      r.payload && typeof r.payload === "object" && !Array.isArray(r.payload)
        ? (r.payload as Record<string, unknown>)
        : {};
    await prisma.simulationDiagnosticLog.update({
      where: { id: r.id },
      data: {
        resolvedAt: now,
        simThreatId: threatId,
        payload: {
          ...base,
          promotedToThreatId: threatId,
          promotedAt: now.toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
  }
}
