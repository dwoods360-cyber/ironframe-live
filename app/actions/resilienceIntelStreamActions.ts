"use server";

import prisma from "@/lib/prisma";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
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

/**
 * Persists a resilience line so open dashboards can poll it into the Intelligence Stream (Zustand).
 * Supports both production ThreatEvent and shadow SimThreatEvent rows.
 */
export async function recordResilienceIntelStreamLine(line: string, threatId: string): Promise<void> {
  const tid = threatId.trim();
  if (!tid) return;
  try {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    let prod: { id: string } | null = null;
    let sim: { id: string } | null = null;
    for (let i = 0; i < 4; i += 1) {
      [prod, sim] = await Promise.all([
        prisma.threatEvent.findUnique({
          where: { id: tid },
          select: { id: true },
        }),
        prisma.riskEvent.findFirst({
          where: { id: tid },
          select: { id: true },
        }),
      ]);
      if (prod || sim) break;
      // Ingress race: card id can exist in client before DB commit finalizes.
      if (i < 3) await sleep(120);
    }

    if (prod) {
      await auditLogCreateLoose({
        data: {
          action: RESILIENCE_ACTION,
          justification: line,
          operatorId: "irontech-resilience",
          threatId: tid,
          isSimulation: false,
        },
      });
      return;
    }

    if (sim) {
      await auditLogCreateLoose({
        data: {
          action: RESILIENCE_ACTION,
          justification: line,
          operatorId: "irontech-resilience",
          threatId: null,
          simThreatId: tid,
          isSimulation: true,
        },
      });
      return;
    }

    // Fallback: if row was removed between emit + write, keep line for debugging visibility.
    await auditLogCreateLoose({
      data: {
        action: RESILIENCE_ACTION,
        justification: line,
        operatorId: "irontech-resilience",
        threatId: null,
        simThreatId: null,
        isSimulation: false,
      },
    });
  } catch (e) {
    console.warn("[resilience] failed to record intel stream line", e);
  }
}

export type ResiliencePollRow = { createdAt: string; line: string };

/** New resilience intel lines for the active tenant (production + simulation). */
export async function pollResilienceIntelStreamLines(
  afterTimeIso: string | null,
  opts?: { showSimulation?: boolean },
): Promise<ResiliencePollRow[]> {
  const userTenantCompanyIds = await getCompanyIdsForActiveTenant();
  if (userTenantCompanyIds.length === 0) return [];
  const showSimulation = opts?.showSimulation === true;
  const tenantScopedOr = [
    { threat: { tenantCompanyId: { in: userTenantCompanyIds } } },
    { riskEvent: { tenantCompanyId: { in: userTenantCompanyIds } } },
  ];
  // For simulation drills, include global simulation rows even if they are outside tenant-bound joins.
  const whereOr = showSimulation ? [...tenantScopedOr, { isSimulation: true }] : tenantScopedOr;
  const rows = await prisma.auditLog.findMany({
    where: {
      action: RESILIENCE_ACTION,
      OR: whereOr,
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
