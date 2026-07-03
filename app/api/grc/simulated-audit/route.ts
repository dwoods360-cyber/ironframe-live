import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { readSimulatedAuditState } from "@/app/lib/simulatedAuditState";
import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const guard = await assertAuthenticatedIronguardTenantOr403(request);
  if (!guard.ok) return guard.response;
  const tenantId = guard.tenantUuid;
  const state = await readSimulatedAuditState();
  return NextResponse.json(
    {
      ok: true,
      tenantId,
      activeHotSwap: state.activeHotSwap,
      lastReport: state.lastReport,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
