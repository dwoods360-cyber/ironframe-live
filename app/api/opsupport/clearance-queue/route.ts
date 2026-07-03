import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import prisma from "@/lib/prisma";
import { ThreatState } from "@prisma/client";
import { requirePlatformAdministrator } from "@/app/lib/auth/platformAdminAccess";
import { readSimulationPlaneEnabled } from "@/app/lib/security/ingressGateway";
import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";
import type { OpSupportClearanceCard } from "@/app/lib/opsupportDashTypes";
import { normalizeIngestionDetailsToString } from "@/app/utils/ingestionDetailsMerge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Pipeline + quarantined threats for the active tenant (sim + non-sim companies).
 * Used by Operational Support live clearance view.
 */
export async function GET(request: NextRequest) {
  noStore();
  const admin = await requirePlatformAdministrator();
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: 403 });
  }

  const guard = await assertAuthenticatedIronguardTenantOr403(request);
  if (!guard.ok) return guard.response;
  const tenantUuid = guard.tenantUuid;

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
      status: { in: [ThreatState.IDENTIFIED, ThreatState.MITIGATED] },
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
    ? await prisma.riskEvent.findMany(clearanceQuery)
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
      ingestionDetails: normalizeIngestionDetailsToString(r.ingestionDetails) ?? null,
    };
  });

  return NextResponse.json(
    { tenantUuid, cards },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
