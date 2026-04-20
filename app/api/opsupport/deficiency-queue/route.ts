import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import prisma from "@/lib/prisma";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { loadOperationalDeficiencyQueueState } from "@/app/lib/opsupport/operationalDeficiencyDb";
import { readSimulationPlaneEnabled } from "@/app/lib/security/ingressGateway";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Shadow-only: unresolved deficiency reports from `SimulationDiagnosticLog` (OpSupport airlock). */
export async function GET() {
  noStore();
  const tenantUuid = await getActiveTenantUuidFromCookies();
  if (!tenantUuid) {
    return NextResponse.json({ error: "No active tenant.", unresolvedCount: 0, unresolved: [] }, { status: 401 });
  }

  const shadow = await readSimulationPlaneEnabled();
  if (!shadow) {
    return NextResponse.json(
      { tenantUuid, unresolvedCount: 0, unresolved: [] },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  const companies = await prisma.company.findMany({
    where: { tenantId: tenantUuid },
    select: { id: true },
  });
  const companyIds = companies.map((c) => c.id);

  const { unresolved, unresolvedCount } = await loadOperationalDeficiencyQueueState(
    prisma,
    tenantUuid,
    companyIds,
  );

  return NextResponse.json(
    { tenantUuid, unresolvedCount, unresolved },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
