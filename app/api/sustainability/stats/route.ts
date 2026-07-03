import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  buildCarbonPulseFinancialBundle,
  buildCarbonPulseLkgPayload,
} from "@/app/services/ironbloom/carbonPulseService";
import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";

export const dynamic = "force-dynamic";

/** Sustainability + carbon pulse snapshot for UI polling (60s). Mirrors /api/grc/carbon-pulse. */
export async function GET(request: NextRequest) {
  const guard = await assertAuthenticatedIronguardTenantOr403(request);
  if (!guard.ok) return guard.response;
  const tenantId = guard.tenantUuid;

  try {
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
  } catch (error) {
    console.error("[api/sustainability/stats]", error);
    const lkg = await buildCarbonPulseLkgPayload(tenantId);
    if (lkg) {
      return NextResponse.json(
        {
          ok: true,
          pulse: lkg.pulse,
          financialImpact: undefined,
          source: "FORENSIC_FALLBACK",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Sustainability stats unavailable." },
      { status: 503 },
    );
  }
}
