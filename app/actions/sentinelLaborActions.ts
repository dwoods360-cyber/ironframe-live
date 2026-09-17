"use server";

import type { Prisma } from "@prisma/client";
import { SimThreatSource } from "@prisma/client";
import { mergeIngestionDetailsPatchJson } from "@/app/utils/ingestionDetailsMerge";
import { withIronguardTenant } from "@/app/lib/server/ironguardSessionTenant";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { bumpSentinelLaborTracker } from "@/app/utils/sentinelLaborTracker";

function isDeepMonitoringSentinel(ingestion: Record<string, unknown>): boolean {
  return ingestion.isDeepMonitoring === true;
}

/**
 * Increment agentic labor counters on a human-sentinel hypothesis while deep monitoring is active.
 */
export async function incrementSentinelDeepMonitoringLabor(
  threatId: string,
  agentName: string,
  cycles: number,
  tenantUuid?: string,
): Promise<void> {
  const tid = threatId?.trim();
  if (!tid) return;
  const tenantId = tenantUuid?.trim() || (await getActiveTenantUuidFromCookies()) || "";
  if (!tenantId) return;

  await withIronguardTenant(tenantId, async (tx) => {
    const row = await tx.riskEvent.findFirst({
      where: { id: tid, tenantId },
      select: { source: true, ingestionDetails: true },
    });
    if (!row || row.source !== SimThreatSource.HUMAN_SENTINEL) return;

    const ingestion =
      row.ingestionDetails && typeof row.ingestionDetails === "object" && !Array.isArray(row.ingestionDetails)
        ? (row.ingestionDetails as Record<string, unknown>)
        : {};
    if (!isDeepMonitoringSentinel(ingestion)) return;

    const laborTracker = bumpSentinelLaborTracker(ingestion.laborTracker, agentName, cycles);
    const merged = mergeIngestionDetailsPatchJson(row.ingestionDetails, {
      laborTracker: laborTracker as Prisma.InputJsonValue,
    });
    await tx.riskEvent.updateMany({
      where: { id: tid, tenantId },
      data: { ingestionDetails: merged },
    });
  });
}
