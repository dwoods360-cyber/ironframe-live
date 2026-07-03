import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import prisma from "@/lib/prisma";
import { requirePlatformAdministrator } from "@/app/lib/auth/platformAdminAccess";
import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";
import { readSimulationPlaneEnabled } from "@/app/lib/security/ingressGateway";
import { isShadowPlaneActiveFromEnv } from "@/app/utils/shadowPlaneActive";
import { loadOperationalDeficiencyQueueState } from "@/app/lib/opsupport/operationalDeficiencyDb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const EMPTY_PAYLOAD = { unresolvedCount: 0, unresolved: [] as unknown[] };

/** Shadow-only: unresolved deficiency reports from `SimulationDiagnosticLog` (OpSupport airlock). Lightweight when inactive so polling does not contend with threat pipeline. */
export async function GET(request: NextRequest) {
  noStore();
  const admin = await requirePlatformAdministrator();
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: 403 });
  }

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

    const guard = await assertAuthenticatedIronguardTenantOr403(request);
    if (!guard.ok) return guard.response;
    const tenantUuid = guard.tenantUuid;

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
    console.error("[opsupport/deficiency-queue]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "deficiency-queue unavailable" },
      { status: 500 },
    );
  }
}
