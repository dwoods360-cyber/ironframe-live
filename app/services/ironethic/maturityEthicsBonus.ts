import "server-only";

import prisma from "@/lib/prisma";
import { computeSccComponentCents } from "@/app/services/ironbloom/tsvCalculator";

const ETHICS_BONUS_POINTS = 0.2;
const LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * +0.2 maturity when SCC-weighted societal slice exceeds internal sustainability ROI for any recent metric
 * (prioritizing externalized climate damages over ledger ALE alone).
 */
export async function computeIronethicMaturityBonus(tenantUuid?: string): Promise<number> {
  const since = new Date(Date.now() - LOOKBACK_MS);

  let companyIds: bigint[] | undefined;
  if (tenantUuid?.trim()) {
    const companies = await prisma.company.findMany({
      where: { tenantId: tenantUuid.trim() },
      select: { id: true },
    });
    companyIds = companies.map((c) => c.id);
    if (companyIds.length === 0) return 0;
  }

  const rows = await prisma.sustainabilityMetric.findMany({
    where: {
      createdAt: { gte: since },
      ...(companyIds
        ? {
            threat: {
              tenantCompanyId: { in: companyIds },
            },
          }
        : {}),
    },
    select: {
      carbonOffsetGrams: true,
      mitigatedValueCents: true,
    },
    take: 300,
  });

  for (const r of rows) {
    const tons = Number(r.carbonOffsetGrams) / 1_000_000;
    const internal = r.mitigatedValueCents ?? 0n;
    const scc = computeSccComponentCents(tons);
    if (scc > internal) return ETHICS_BONUS_POINTS;
  }

  return 0;
}
