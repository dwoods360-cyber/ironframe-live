import { NextResponse } from "next/server";
import {
  buildCarbonPulseFinancialBundle,
  buildCarbonPulseLkgPayload,
} from "@/app/services/ironbloom/carbonPulseService";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

export const dynamic = "force-dynamic";

export async function GET() {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "No active tenant." }, { status: 400 });
  }

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
    console.error("[api/grc/carbon-pulse]", error);
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
      { ok: false, error: error instanceof Error ? error.message : "Carbon pulse unavailable." },
      { status: 503 },
    );
  }
}
