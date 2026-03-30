"use server";

import prisma from "@/lib/prisma";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

async function getCompanyIdsForActiveTenant(): Promise<bigint[]> {
  const tenantUuid = await getActiveTenantUuidFromCookies();
  const rows = await prisma.company.findMany({
    where: { tenantId: tenantUuid },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

const RESILIENCE_ACTION = "RESILIENCE_INTEL_STREAM";

/** Persists a line so open dashboards can poll it into the Intelligence Stream (Zustand). */
export async function recordResilienceIntelStreamLine(line: string, threatId: string): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: RESILIENCE_ACTION,
        justification: line,
        operatorId: "irontech-resilience",
        threatId,
        isSimulation: false,
      },
    });
  } catch (e) {
    console.warn("[resilience] failed to record intel stream line", e);
  }
}

export type ResiliencePollRow = { createdAt: string; line: string };

/** New resilience intel lines for the active tenant (for client polling). */
export async function pollResilienceIntelStreamLines(
  afterTimeIso: string | null,
): Promise<ResiliencePollRow[]> {
  const companyIds = await getCompanyIdsForActiveTenant();
  if (companyIds.length === 0) return [];
  const rows = await prisma.auditLog.findMany({
    where: {
      action: RESILIENCE_ACTION,
      threat: { tenantCompanyId: { in: companyIds } },
      ...(afterTimeIso ? { createdAt: { gt: new Date(afterTimeIso) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { createdAt: true, justification: true },
  });
  return rows.map((r) => ({
    createdAt: r.createdAt.toISOString(),
    line: r.justification ?? "",
  }));
}
