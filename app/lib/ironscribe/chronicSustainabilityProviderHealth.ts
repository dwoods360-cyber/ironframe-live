import "server-only";

import prisma from "@/lib/prisma";
import { IRONWATCH_SERVICE_KEY_ELECTRICITY_MAPS } from "@/src/services/ironwatch/apiHeartbeat";

/** Rolling window for chronic-failure analytics (Ironscribe preventative directives). */
export const CHRONIC_PROVIDER_WINDOW_DAYS = 30;

/** Distinct outage episodes in this window that qualify as “chronic”. */
export const CHRONIC_PROVIDER_FAILURE_THRESHOLD = 3;

/** Primary attested carbon-intensity provider (Ironwatch / Ironbloom family). */
export const PRIMARY_SUSTAINABILITY_LIVE_PROVIDER_LABEL = "Electricity Maps";

/** Code path for redundant failover (per GRC strategist brief). */
export const SECONDARY_SUSTAINABILITY_PROVIDER_IMPLEMENTATION_PATH =
  "src/services/sustainability/failoverCarbonProvider.ts";

export type ChronicProviderAnalytics = {
  windowDays: number;
  failureEpisodes: number;
  isChronicallyUnstable: boolean;
  serviceKey: string;
  providerLabel: string;
};

/**
 * Count **failure episodes**: transitions into `ok: false` after `ok: true` (or from no prior row).
 * Matches “N outages in 30 days” without counting every 15m tick as a separate incident.
 */
export async function analyzeChronicSustainabilityProviderHealth(
  asOf: Date = new Date(),
): Promise<ChronicProviderAnalytics> {
  const windowStart = new Date(asOf.getTime() - CHRONIC_PROVIDER_WINDOW_DAYS * 24 * 3600 * 1000);
  const rows = await prisma.systemHealthLog.findMany({
    where: {
      serviceKey: IRONWATCH_SERVICE_KEY_ELECTRICITY_MAPS,
      createdAt: { gte: windowStart, lte: asOf },
    },
    orderBy: { createdAt: "asc" },
    select: { ok: true },
  });

  let failureEpisodes = 0;
  let inFailureEpisode = false;
  for (const row of rows) {
    if (!row.ok && !inFailureEpisode) {
      failureEpisodes += 1;
      inFailureEpisode = true;
    } else if (row.ok) {
      inFailureEpisode = false;
    }
  }

  return {
    windowDays: CHRONIC_PROVIDER_WINDOW_DAYS,
    failureEpisodes,
    isChronicallyUnstable: failureEpisodes >= CHRONIC_PROVIDER_FAILURE_THRESHOLD,
    serviceKey: IRONWATCH_SERVICE_KEY_ELECTRICITY_MAPS,
    providerLabel: PRIMARY_SUSTAINABILITY_LIVE_PROVIDER_LABEL,
  };
}
