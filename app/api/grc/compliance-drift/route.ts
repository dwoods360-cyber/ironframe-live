import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { activeDriftAlerts, readComplianceDriftState } from "@/app/lib/complianceDriftState";
import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";
import { getActiveComplianceDriftMaturityPenalty } from "@/app/services/complianceDriftMaturityPenalty";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const guard = await assertAuthenticatedIronguardTenantOr403(request);
  if (!guard.ok) return guard.response;
  const tenantId = guard.tenantUuid;
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
