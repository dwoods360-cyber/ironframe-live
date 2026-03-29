import { NextResponse } from "next/server";
import { ThreatState } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

/**
 * Lightweight poll: PIPELINE threats for the active tenant only (id + ingestionDetails).
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
      status: ThreatState.PIPELINE,
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
