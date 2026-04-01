import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { CLEARANCE_QUEUE_STATUSES } from "@/app/utils/clearanceQueue";

/**
 * Lightweight poll: DMZ / clearance-queue threats (pipeline + quarantined) for the active tenant.
 */
export async function GET() {
  const tenantUuid = await getActiveTenantUuidFromCookies();
  const company = await prisma.company.findFirst({
    where: { tenantId: tenantUuid },
    select: { id: true },
  });

  if (!company) {
    return NextResponse.json({
      tenantUuid,
      threats: [] as { id: string; ingestionDetails: string | null }[],
    });
  }

  const threats = await prisma.threatEvent.findMany({
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

  return NextResponse.json({
    tenantUuid,
    threats: threats.map((t) => ({
      id: t.id,
      ingestionDetails: t.ingestionDetails,
    })),
  });
}
