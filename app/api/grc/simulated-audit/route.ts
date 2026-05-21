import { NextResponse } from "next/server";
import { readSimulatedAuditState } from "@/app/lib/simulatedAuditState";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

export const dynamic = "force-dynamic";

export async function GET() {
  const tenantId = await getActiveTenantUuidFromCookies();
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
