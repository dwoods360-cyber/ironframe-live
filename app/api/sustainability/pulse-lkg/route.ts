import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildCarbonPulseLkgFinancialBundle } from "@/app/services/ironbloom/carbonPulseService";
import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";

export const dynamic = "force-dynamic";

/**
 * Last-known-good carbon pulse: ledger `mitigatedValueCents` + local Ironlock throttle state (no Electricity Maps).
 */
export async function GET(request: NextRequest) {
  const guard = await assertAuthenticatedIronguardTenantOr403(request);
  if (!guard.ok) return guard.response;
  const tenantId = guard.tenantUuid;

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
