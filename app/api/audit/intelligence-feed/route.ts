export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import prisma from "@/lib/prisma";
import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";

export type IntelligenceDiagnosticRow = {
  id: string;
  createdAt: string;
  action: string;
  operatorId: string;
  simThreatId: string | null;
  payload: unknown;
};

/**
 * Shadow-plane diagnostics for the unified Intelligence Feed (merged with AuditLog + work notes in UI).
 */
export async function GET(request: NextRequest) {
  noStore();
  const guard = await assertAuthenticatedIronguardTenantOr403(request);
  if (!guard.ok) return guard.response;
  const tenantUuid = guard.tenantUuid;

  const threatId = request.nextUrl.searchParams.get("threatId")?.trim() || null;
  const take = Math.min(
    200,
    Math.max(1, Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "80", 10) || 80),
  );

  const rows = await prisma.simulationDiagnosticLog.findMany({
    where: {
      tenantUuid,
      ...(threatId ? { simThreatId: threatId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      createdAt: true,
      action: true,
      operatorId: true,
      simThreatId: true,
      payload: true,
    },
  });

  const body: IntelligenceDiagnosticRow[] = rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    action: r.action,
    operatorId: r.operatorId,
    simThreatId: r.simThreatId,
    payload: r.payload,
  }));

  return NextResponse.json(
    { rows: body },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
