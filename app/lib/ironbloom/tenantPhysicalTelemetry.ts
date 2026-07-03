import "server-only";

import prisma from "@/lib/prisma";
import { tenantKeyFromUuid } from "@/app/utils/tenantIsolation";

/** Sum sealed physical kWh from production sustainability metrics for a tenant. */
export async function aggregateTenantKwhAverted(tenantUuid: string): Promise<bigint> {
  const companies = await prisma.company.findMany({
    where: { tenantId: tenantUuid },
    select: { id: true },
  });
  if (!companies.length) return 0n;

  const agg = await prisma.sustainabilityMetric.aggregate({
    where: {
      threat: { tenantCompanyId: { in: companies.map((c) => c.id) } },
      kwhAverted: { gt: 0n },
    },
    _sum: { kwhAverted: true },
  });
  return agg._sum?.kwhAverted ?? 0n;
}

export async function resolveTenantPulseUnitsKwh(tenantUuid: string): Promise<number> {
  const total = await aggregateTenantKwhAverted(tenantUuid);
  if (total <= 0n) return 0;
  const asNumber = Number(total);
  return Number.isFinite(asNumber) && asNumber > 0 ? asNumber : 0;
}

export async function findLatestThreatPhysicalTelemetry(tenantUuid: string): Promise<{
  threatId: string;
  ingestionDetails: string | null;
} | null> {
  const companies = await prisma.company.findMany({
    where: { tenantId: tenantUuid },
    select: { id: true },
  });
  if (!companies.length) return null;

  const row = await prisma.threatEvent.findFirst({
    where: {
      tenantCompanyId: { in: companies.map((c) => c.id) },
      ingestionDetails: { not: null },
      status: "RESOLVED",
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, ingestionDetails: true },
  });
  if (!row) return null;
  return { threatId: row.id, ingestionDetails: row.ingestionDetails };
}

export async function resolveDashboardPhysicalKwh(tenantUuid: string | null): Promise<{
  unitsKwh: number;
  tenantKey: ReturnType<typeof tenantKeyFromUuid>;
}> {
  if (!tenantUuid?.trim()) {
    return { unitsKwh: 0, tenantKey: null };
  }
  const tenantKey = tenantKeyFromUuid(tenantUuid.trim());
  const unitsKwh = await resolveTenantPulseUnitsKwh(tenantUuid.trim());
  return { unitsKwh, tenantKey };
}
