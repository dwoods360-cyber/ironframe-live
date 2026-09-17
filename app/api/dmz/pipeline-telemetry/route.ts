import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withIronguardTenant } from "@/app/lib/server/ironguardSessionTenant";
import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";
import { CLEARANCE_QUEUE_STATUSES } from "@/app/utils/clearanceQueue";

/**
 * Lightweight poll: DMZ / clearance-queue threats (pipeline + quarantined) for the active tenant.
 */
export async function GET(request: NextRequest) {
  const guard = await assertAuthenticatedIronguardTenantOr403(request);
  if (!guard.ok) return guard.response;
  const tenantUuid = guard.tenantUuid;
  const threats = await withIronguardTenant(tenantUuid, async (tx) => {
    const company = await tx.company.findFirst({
      where: { tenantId: tenantUuid },
      select: { id: true },
    });
    if (!company) return [];
    return tx.threatEvent.findMany({
      where: {
        status: { in: CLEARANCE_QUEUE_STATUSES },
        tenantCompanyId: company.id,
      },
      select: {
        id: true,
        ingestionDetails: true,
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    });
  });

  return NextResponse.json({
    tenantUuid,
    threats: threats.map((t) => ({
      id: t.id,
      ingestionDetails: t.ingestionDetails,
    })),
  });
}
