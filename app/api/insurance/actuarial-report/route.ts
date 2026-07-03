import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import prisma from "@/lib/prisma";
import { generateBudgetReport } from "@/app/utils/generateBudgetReport";
import { normalizeCarrierKey } from "@/app/utils/carrierTemplates";
import { fetchInsuranceModelForTenant } from "@/app/utils/insuranceTenantModel";
import { readSimulationPlaneEnabled } from "@/app/lib/security/ingressGateway";
import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";

export const dynamic = "force-dynamic";

/**
 * GET actuarial evidence PDF for underwriters. Requires `x-tenant-id` (UUID), same as `/api/dashboard`.
 * Optional: `?premiumCents=` — annual premium in integer cents (defaults to model default).
 * Optional: `?carrierKey=` — GENERIC | CHUBB | BEAZLEY | MUNICH_RE (drives PDF layout + attestation).
 */
export async function GET(request: NextRequest) {
  noStore();
  const guard = await assertAuthenticatedIronguardTenantOr403(request);
  if (!guard.ok) return guard.response;
  const activeTenantUuid = guard.tenantUuid;

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
  const isSimulation = await readSimulationPlaneEnabled();

  const auditReceiptRows = await prisma.auditReceipt.findMany({
    where: { tenantId: activeTenantUuid },
    orderBy: { shreddedAt: "desc" },
    take: 10,
    select: {
      shreddedAt: true,
      titleSnapshot: true,
      sectorSnapshot: true,
      receiptHashSha256: true,
    },
  });
  const shreddingLogRows = auditReceiptRows.map((r) => ({
    timestampIso: r.shreddedAt.toISOString(),
    assetName: r.titleSnapshot,
    sector: r.sectorSnapshot?.trim() || "—",
    agentId: "Ironwatch (Agent 13)",
    sha256Signature: r.receiptHashSha256,
  }));

  const bytes = generateBudgetReport({
    basePremium_cents,
    framework: model.framework,
    hasContinuousMonitoring: model.hasContinuousMonitoring,
    hasDueDiligencePdfs: model.hasDueDiligencePdfs,
    carrierKey,
    isSimulation,
    glossaryIndustryLabel: model.industry ?? model.framework,
    shreddingLogRows,
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
