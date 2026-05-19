import { NextResponse } from "next/server";

import { activeDriftAlerts, readComplianceDriftState } from "@/app/lib/complianceDriftState";
import { getActiveComplianceDriftMaturityPenalty } from "@/app/services/complianceDriftMaturityPenalty";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

export const dynamic = "force-dynamic";

export async function GET() {
  const tenantId = await getActiveTenantUuidFromCookies();
  const state = await readComplianceDriftState();
  const penalty = await getActiveComplianceDriftMaturityPenalty();
  const active = activeDriftAlerts(state);

  return NextResponse.json(
    {
      ok: true,
      tenantId,
      lastPollAt: state.lastPollAt,
      horizons: state.horizons,
      alerts: state.alerts,
      activeDrifts: active,
      pollStats: state.pollStats,
      maturityPenalty: penalty,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
