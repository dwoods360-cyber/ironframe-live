import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { resolveTenantIndustryForBenchmarks } from "@/app/utils/tenantIndustryBenchmark";
import { readSimulationPlaneEnabled } from "@/app/lib/security/ingressGateway";
import { withIronguardTenant } from "@/app/lib/server/ironguardSessionTenant";
import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";
import { ThreatState } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Plotted on the enterprise heat map (non-terminal states). */
const HEAT_MAP_STATUSES: ThreatState[] = [
  ThreatState.IDENTIFIED,
  ThreatState.CONFIRMED,
  ThreatState.CONFIRMED,
];

type HeatMapThreatPayload = {
  id: string;
  name: string;
  likelihood: number;
  impact: number;
  score: number;
  /** USD from `financialRisk_cents` / 100 — drives bubble size and zone totals. */
  financialRiskUsd: number;
  industry?: string;
  source?: string;
};

/**
 * Maps event score -> matrix coordinates (legacy compatibility for plotting).
 */
function deriveLikelihoodImpactFromScore(score: number): { likelihood: number; impact: number } {
  const s = score == null || Number.isNaN(Number(score)) ? 5 : Number(score);
  let impact: number;
  if (s === 0) {
    impact = 5;
  } else if (s <= 10) {
    impact = Math.min(10, Math.max(1, s));
  } else {
    impact = Math.min(10, Math.max(1, Math.round(s / 10)));
  }
  const likelihood = 8;
  return { likelihood, impact };
}

/** ALE-driven glow intensity (1-100). High ALE => high glow. */
function deriveAleIntensity(financialRiskCents: bigint): number {
  const usd = Number(financialRiskCents) / 100;
  if (!Number.isFinite(usd) || usd <= 0) return 1;
  const normalized = Math.log10(usd + 1) / Math.log10(25_000_000 + 1);
  return Math.max(1, Math.min(100, Math.round(normalized * 100)));
}

/** GET /api/threat-events-heatmap — tenant-scoped ThreatEvent rows for the risk matrix. */
export async function GET(request: NextRequest) {
  noStore();
  const guard = await assertAuthenticatedIronguardTenantOr403(request);
  if (!guard.ok) return guard.response;
  const tenantUuid = guard.tenantUuid;

  const simPlane = await readSimulationPlaneEnabled();
  const { tenantRow, company, rows } = await withIronguardTenant(tenantUuid, async (tx) => {
    const [tenantHit, companyHit] = await Promise.all([
      tx.tenant.findUnique({
        where: { id: tenantUuid },
        select: { industry: true },
      }),
      tx.company.findFirst({
        where: { tenantId: tenantUuid },
        select: { id: true },
      }),
    ]);
    if (!companyHit) {
      return { tenantRow: tenantHit, company: null, rows: [] as Array<{
        id: string;
        title: string;
        score: number;
        financialRisk_cents: bigint;
        sourceAgent: string;
        targetEntity: string;
      }> };
    }
    const heatQuery = {
      where: {
        tenantCompanyId: companyHit.id,
        status: { in: HEAT_MAP_STATUSES },
      },
      select: {
        id: true,
        title: true,
        score: true,
        financialRisk_cents: true,
        sourceAgent: true,
        targetEntity: true,
      },
      orderBy: { updatedAt: "desc" as const },
      take: 200,
    };
    const heatRows = simPlane
      ? await tx.riskEvent.findMany(heatQuery)
      : await tx.threatEvent.findMany(heatQuery);
    return { tenantRow: tenantHit, company: companyHit, rows: heatRows };
  });

  const tenantIndustry = resolveTenantIndustryForBenchmarks(tenantRow?.industry);
  if (!company) {
    return NextResponse.json({
      threats: [] as HeatMapThreatPayload[],
      tenantIndustry,
    });
  }

  const threats: HeatMapThreatPayload[] = rows.map((t) => {
    const { likelihood, impact } = deriveLikelihoodImpactFromScore(t.score);
    const cents = t.financialRisk_cents ?? 0n;
    const financialRiskUsd = Number(cents) / 100;
    const aleIntensity = deriveAleIntensity(cents);
    return {
      id: t.id,
      name: t.title,
      likelihood,
      impact,
      score: aleIntensity,
      financialRiskUsd,
      industry: t.targetEntity,
      source: t.sourceAgent,
    };
  });

  return NextResponse.json({ threats, tenantIndustry });
}
