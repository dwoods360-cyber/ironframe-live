import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import prisma from "@/lib/prisma";
import { ThreatState } from "@prisma/client";
import { readSimulationPlaneEnabled } from "@/app/lib/security/ingressGateway";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import type { OpSupportClearanceCard } from "@/app/lib/opsupportDashTypes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Pipeline + quarantined threats for the active tenant (sim + non-sim companies).
 * Used by Operational Support live clearance view.
 */
export async function GET() {
  noStore();
  const tenantUuid = await getActiveTenantUuidFromCookies();
  if (!tenantUuid) {
    return NextResponse.json(
      { error: "No active tenant.", cards: [] as OpSupportClearanceCard[] },
      { status: 401 },
    );
  }

  const companies = await prisma.company.findMany({
    where: { tenantId: tenantUuid },
    select: { id: true, name: true, isTestRecord: true },
  });
  const companyById = new Map(
    companies.map((c) => [c.id.toString(), { name: c.name, isTestRecord: c.isTestRecord }]),
  );
  const companyIds = companies.map((c) => c.id);

  if (companyIds.length === 0) {
    return NextResponse.json({ tenantUuid, cards: [] as OpSupportClearanceCard[] });
  }

  const simPlane = await readSimulationPlaneEnabled();
  const clearanceQuery = {
    where: {
      status: { in: [ThreatState.PIPELINE, ThreatState.QUARANTINED] },
      tenantCompanyId: { in: companyIds },
    },
    orderBy: { createdAt: "desc" as const },
    take: 120,
    select: {
      id: true,
      title: true,
      status: true,
      sourceAgent: true,
      targetEntity: true,
      score: true,
      financialRisk_cents: true,
      createdAt: true,
      updatedAt: true,
      tenantCompanyId: true,
      dispositionStatus: true,
      isFalsePositive: true,
      receiptHash: true,
      ingestionDetails: true,
    },
  };
  const rows = simPlane
    ? await prisma.simThreatEvent.findMany(clearanceQuery)
    : await prisma.threatEvent.findMany(clearanceQuery);

  const cards: OpSupportClearanceCard[] = rows.map((r) => {
    const cid = r.tenantCompanyId != null ? r.tenantCompanyId.toString() : null;
    const co = cid ? companyById.get(cid) : undefined;
    return {
      id: r.id,
      title: r.title,
      status: r.status,
      sourceAgent: r.sourceAgent,
      targetEntity: r.targetEntity,
      score: r.score,
      financialRisk_cents: r.financialRisk_cents.toString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      tenantCompanyId: cid,
      companyName: co?.name ?? null,
      isTestCompany: co?.isTestRecord ?? false,
      dispositionStatus: r.dispositionStatus ?? null,
      isFalsePositive: r.isFalsePositive,
      receiptHash: r.receiptHash ?? null,
      ingestionDetails: r.ingestionDetails ?? null,
    };
  });

  return NextResponse.json(
    { tenantUuid, cards },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
