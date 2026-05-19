import { NextResponse } from "next/server";
import { buildCarbonPulseLkgFinancialBundle } from "@/app/services/ironbloom/carbonPulseService";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

export const dynamic = "force-dynamic";

/**
 * Last-known-good carbon pulse: ledger `mitigatedValueCents` + local Ironlock throttle state (no Electricity Maps).
 */
export async function GET() {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "No active tenant." }, { status: 400 });
  }

  const bundle = await buildCarbonPulseLkgFinancialBundle(tenantId);
  if (!bundle) {
    return NextResponse.json(
      { ok: false, error: "No sustainability ledger row for tenant." },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { ok: true, pulse: bundle.pulse, financialImpact: bundle.financialImpact, lkg: bundle.lkg },
    { headers: { "Cache-Control": "no-store" } },
  );
}
