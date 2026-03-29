import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import prisma from "@/lib/prisma";
import { ThreatState } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Plotted on the enterprise heat map (non-terminal states). */
const HEAT_MAP_STATUSES: ThreatState[] = [
  ThreatState.PIPELINE,
  ThreatState.ACTIVE,
  ThreatState.CONFIRMED,
];

export type HeatMapThreatPayload = {
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
 * Maps ThreatEvent.score → impact (1–10); likelihood fixed at 8 per product spec (MVP spread on X).
 * `derivedRisk = impact * likelihood` is 1–100 for color bands.
 */
export function deriveLikelihoodImpactFromScore(score: number): { likelihood: number; impact: number } {
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

/** GET /api/threat-events-heatmap — tenant-scoped ThreatEvent rows for the risk matrix. */
export async function GET(request: NextRequest) {
  noStore();
  const tenantUuid = request.headers.get("x-tenant-id")?.trim() || null;
  if (!tenantUuid) {
    return NextResponse.json(
      { error: "Tenant context required. Send x-tenant-id header (tenant UUID)." },
      { status: 401 },
    );
  }

  const company = await prisma.company.findFirst({
    where: { tenantId: tenantUuid },
    select: { id: true },
  });

  if (!company) {
    return NextResponse.json({ threats: [] as HeatMapThreatPayload[] });
  }

  const rows = await prisma.threatEvent.findMany({
    where: {
      tenantCompanyId: company.id,
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
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const threats: HeatMapThreatPayload[] = rows.map((t) => {
    const { likelihood, impact } = deriveLikelihoodImpactFromScore(t.score);
    const derivedRisk = impact * likelihood;
    const cents = t.financialRisk_cents ?? 0n;
    const financialRiskUsd = Number(cents) / 100;
    return {
      id: t.id,
      name: t.title,
      likelihood,
      impact,
      score: derivedRisk,
      financialRiskUsd,
      industry: t.targetEntity,
      source: t.sourceAgent,
    };
  });

  return NextResponse.json({ threats });
}
