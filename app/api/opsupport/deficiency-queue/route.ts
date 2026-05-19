import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import prisma from "@/lib/prisma";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { loadOperationalDeficiencyQueueState } from "@/app/lib/opsupport/operationalDeficiencyDb";
import { readSimulationPlaneEnabled } from "@/app/lib/security/ingressGateway";
import { isShadowPlaneActiveFromEnv } from "@/app/utils/shadowPlaneActive";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const EMPTY_PAYLOAD = { unresolvedCount: 0, unresolved: [] as unknown[] };

/** Shadow-only: unresolved deficiency reports from `SimulationDiagnosticLog` (OpSupport airlock). Lightweight when inactive so polling does not contend with threat pipeline. */
export async function GET() {
  noStore();
  try {
    const simCookie = await readSimulationPlaneEnabled();
    const envShadow = isShadowPlaneActiveFromEnv();
    const shadowDiagnostics = simCookie || envShadow;

    if (!shadowDiagnostics) {
      return NextResponse.json(
        { tenantUuid: null, ...EMPTY_PAYLOAD },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }

    const tenantUuid = await getActiveTenantUuidFromCookies();

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
  } catch (e) {
    console.error("[api/opsupport/deficiency-queue]", e);
    return NextResponse.json(
      {
        tenantUuid: null,
        ...EMPTY_PAYLOAD,
        error: e instanceof Error ? e.message : "deficiency-queue unavailable",
      },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
