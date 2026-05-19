import { NextResponse } from "next/server";
import { buildCarbonPulseFinancialBundle } from "@/app/services/ironbloom/carbonPulseService";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

export const dynamic = "force-dynamic";

export async function GET() {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "No active tenant." }, { status: 400 });
  }

  const { pulse, financialImpact } = await buildCarbonPulseFinancialBundle(tenantId);

  return NextResponse.json(
    {
      ok: true,
      pulse,
      financialImpact,
      source: pulse.intensitySource,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
