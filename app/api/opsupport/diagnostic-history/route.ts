import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import prisma from "@/lib/prisma";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { calculateComponentHealth } from "@/app/lib/opsupport/componentHealth";
import {
  OPERATIONAL_DEFICIENCY_REPORT,
  OPERATIONAL_SELF_TEST_PASS,
} from "@/app/lib/opsupport/operationalDeficiencyQueue";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Shadow diagnostic analytics: rows from `SimulationDiagnosticLog` fed through
 * `calculateComponentHealth` (weighted points + health bar) for PO prioritization.
 */
export async function GET() {
  noStore();
  const tenantUuid = await getActiveTenantUuidFromCookies();
  if (!tenantUuid) {
    return NextResponse.json({ error: "No active tenant.", components: [] }, { status: 401 });
  }

  const logs = await prisma.simulationDiagnosticLog.findMany({
    where: {
      tenantUuid,
      action: { in: [OPERATIONAL_DEFICIENCY_REPORT, OPERATIONAL_SELF_TEST_PASS] },
    },
    orderBy: { createdAt: "desc" },
    take: 2500,
    select: { id: true, createdAt: true, action: true, payload: true, resolvedAt: true },
  });

  const components = calculateComponentHealth(logs);

  return NextResponse.json(
    { tenantUuid, components, fetchedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
