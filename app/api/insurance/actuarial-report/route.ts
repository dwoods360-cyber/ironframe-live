import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { generateBudgetReport } from "@/app/utils/generateBudgetReport";
import { normalizeCarrierKey } from "@/app/utils/carrierTemplates";
import { fetchInsuranceModelForTenant } from "@/app/utils/insuranceTenantModel";

export const dynamic = "force-dynamic";

/**
 * GET actuarial evidence PDF for underwriters. Requires `x-tenant-id` (UUID), same as `/api/dashboard`.
 * Optional: `?premiumCents=` — annual premium in integer cents (defaults to model default).
 * Optional: `?carrierKey=` — GENERIC | CHUBB | BEAZLEY | MUNICH_RE (drives PDF layout + attestation).
 */
export async function GET(request: NextRequest) {
  noStore();
  const activeTenantUuid = request.headers.get("x-tenant-id")?.trim() || null;
  if (!activeTenantUuid) {
    return NextResponse.json(
      { error: "Tenant context required. Send x-tenant-id header (tenant UUID)." },
      { status: 401 },
    );
  }

  let basePremium_cents: bigint | undefined;
  const raw = request.nextUrl.searchParams.get("premiumCents")?.trim();
  if (raw) {
    try {
      const n = BigInt(raw);
      if (n > 0n) basePremium_cents = n;
    } catch {
      /* ignore invalid */
    }
  }

  const carrierKey = normalizeCarrierKey(request.nextUrl.searchParams.get("carrierKey"));

  const model = await fetchInsuranceModelForTenant(activeTenantUuid);
  const bytes = generateBudgetReport({
    basePremium_cents,
    framework: model.framework,
    hasContinuousMonitoring: model.hasContinuousMonitoring,
    hasDueDiligencePdfs: model.hasDueDiligencePdfs,
    carrierKey,
  });

  const slug = carrierKey.toLowerCase().replace(/_/g, "-");
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ironframe-actuarial-${slug}.pdf"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
