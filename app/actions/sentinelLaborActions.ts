"use server";

import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { SimThreatSource } from "@prisma/client";
import { mergeIngestionDetailsPatchJson } from "@/app/utils/ingestionDetailsMerge";
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
): Promise<void> {
  const tid = threatId?.trim();
  if (!tid) return;
  const row = await prisma.riskEvent.findFirst({
    where: { id: tid },
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
  await prisma.riskEvent.updateMany({
    where: { id: tid },
    data: { ingestionDetails: merged },
  });
}
