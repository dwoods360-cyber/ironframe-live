import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import prisma from "@/lib/prisma";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import type { OpSupportSimAuditRow } from "@/app/lib/opsupportDashTypes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function previewFromJsonPayload(payload: unknown): string {
  try {
    const j = JSON.stringify(payload ?? {});
    const t = j.trim();
    return t.length > 220 ? `${t.slice(0, 220)}…` : t || "—";
  } catch {
    return "—";
  }
}

/**
 * Simulation / drill audit: Prisma `AuditLog` (sim-flagged, bots, SIMULATION actions) plus
 * `SimulationDiagnosticLog` (structural self-test — never mixed into production `ThreatEvent`).
 */
export async function GET() {
  noStore();
  const tenantUuid = await getActiveTenantUuidFromCookies();
  if (!tenantUuid) {
    return NextResponse.json(
      { error: "No active tenant.", rows: [] as OpSupportSimAuditRow[] },
      { status: 401 },
    );
  }

  const companies = await prisma.company.findMany({
    where: { tenantId: tenantUuid },
    select: { id: true },
  });
  const companyIds = companies.map((c) => c.id);

  const threatScope =
    companyIds.length > 0
      ? ([{ threatId: null }, { threat: { tenantCompanyId: { in: companyIds } } }] as const)
      : ([{ threatId: null }] as const);

  const [auditRows, diagRows] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        AND: [
          {
            OR: [
              { isSimulation: true },
              { operatorId: { equals: "GRCBOT", mode: "insensitive" } },
              { operatorId: { equals: "KIMBOT", mode: "insensitive" } },
              { action: { contains: "SIMULATION", mode: "insensitive" } },
            ],
          },
          { OR: [...threatScope] },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 150,
      select: {
        id: true,
        createdAt: true,
        action: true,
        operatorId: true,
        isSimulation: true,
        threatId: true,
        justification: true,
      },
    }),
    prisma.simulationDiagnosticLog.findMany({
      where: { tenantUuid },
      orderBy: { createdAt: "desc" },
      take: 150,
      select: {
        id: true,
        createdAt: true,
        action: true,
        operatorId: true,
        simThreatId: true,
        payload: true,
      },
    }),
  ]);

  const fromAudit: OpSupportSimAuditRow[] = auditRows.map((r) => {
    const j = (r.justification ?? "").trim();
    const preview = j.length > 220 ? `${j.slice(0, 220)}…` : j;
    return {
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      action: r.action,
      operatorId: r.operatorId,
      isSimulation: r.isSimulation,
      threatId: r.threatId,
      justificationPreview: preview || "—",
    };
  });

  const fromDiag: OpSupportSimAuditRow[] = diagRows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    action: r.action,
    operatorId: r.operatorId,
    isSimulation: true,
    threatId: r.simThreatId,
    justificationPreview: previewFromJsonPayload(r.payload),
  }));

  const merged = [...fromAudit, ...fromDiag]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    .slice(0, 150);

  return NextResponse.json(
    { tenantUuid, rows: merged },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
