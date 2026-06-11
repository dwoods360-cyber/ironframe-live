import prisma from "@/lib/prisma";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import {
  prismaAbortOptions,
  throwIfAborted,
} from "@/app/lib/server/simulationRequestAbort";

export type ResiliencePollRow = { createdAt: string; line: string };

const RESILIENCE_ACTION = "RESILIENCE_INTEL_STREAM";

async function getCompanyIdsForActiveTenant(signal?: AbortSignal | null): Promise<bigint[]> {
  throwIfAborted(signal);
  const tenantUuid = await getActiveTenantUuidFromCookies();
  throwIfAborted(signal);
  const rows = await prisma.company.findMany({
    where: { tenantId: tenantUuid },
    select: { id: true },
    ...prismaAbortOptions(signal),
  });
  throwIfAborted(signal);
  return rows.map((r) => r.id);
}

/** Agent 11 — read-only audit log poll (no ALE baseline tables). */
export async function pollResilienceIntelStreamLinesCore(
  afterTimeIso: string | null,
  _opts?: { showSimulation?: boolean },
  signal?: AbortSignal | null,
): Promise<ResiliencePollRow[]> {
  throwIfAborted(signal);
  const userTenantCompanyIds = await getCompanyIdsForActiveTenant(signal);
  if (userTenantCompanyIds.length === 0) return [];
  throwIfAborted(signal);
  const whereOr = [
    { threat: { tenantCompanyId: { in: userTenantCompanyIds } } },
    { riskEvent: { tenantCompanyId: { in: userTenantCompanyIds } } },
  ];
  const rows = await prisma.auditLog.findMany({
    where: {
      action: RESILIENCE_ACTION,
      OR: whereOr,
      ...(afterTimeIso ? { createdAt: { gt: new Date(afterTimeIso) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { createdAt: true, justification: true },
    ...prismaAbortOptions(signal),
  });
  throwIfAborted(signal);
  return rows.map((r) => ({
    createdAt: r.createdAt.toISOString(),
    line: r.justification ?? "",
  }));
}

