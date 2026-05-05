"use server";

import { ThreatState } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getTenantUnderwriterReadinessScore } from "@/app/actions/complianceActions";
import { resolveTenantIndustryForBenchmarks } from "@/app/utils/tenantIndustryBenchmark";
import { OMNI_BENCHMARK_INDUSTRIES } from "@/app/utils/omniBenchmarkIndustries";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IRONETHIC_MIN_COHORT = 5;
const DEFAULT_FRAMEWORK = "SOC2";

/** Same cadence as `prisma/stressMarketVolatilitySpike.ts` (7× MS_WEEK between oldest and newest of 8 points). */
const MS_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Lower bound for `MarketBenchmarkSnapshot.timestamp: { gte }` so all 8 seeded weekly rows are included. */
function benchmarkSnapshotWindowStart(): Date {
  return new Date(Date.now() - 8 * MS_WEEK_MS);
}

export type IndustryBenchmarkPayload = {
  benchmarkingEnabled: boolean;
  tenantIndustry: string;
  cohortType: "INDUSTRY" | "BROAD_SECTOR";
  cohortSize: number;
  yourScorePct: number;
  industryAvgPct: number;
  percentileBucket: "Top 10" | "Median" | "Bottom";
  insight: string;
};

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function percentileBucket(your: number, peerAvg: number): IndustryBenchmarkPayload["percentileBucket"] {
  const diff = your - peerAvg;
  if (diff >= 10) return "Top 10";
  if (diff <= -10) return "Bottom";
  return "Median";
}

/**
 * Privacy-safe peer benchmark lookup. Returns only aggregate stats; never tenant IDs or tenant names.
 */
export async function getIndustryBenchmarks(
  tenantUuid: string,
): Promise<{ ok: true; payload: IndustryBenchmarkPayload } | { ok: false; error: string }> {
  const tid = tenantUuid.trim();
  if (!UUID_RE.test(tid)) return { ok: false, error: "Invalid tenant UUID." };

  const current = await prisma.tenant.findUnique({
    where: { id: tid },
    select: { id: true, industry: true, shareAnonymizedBenchmarks: true },
  });
  if (!current) return { ok: false, error: "Tenant not found." };

  const tenantIndustry = resolveTenantIndustryForBenchmarks(current.industry);
  const ownScoreRes = await getTenantUnderwriterReadinessScore(tid, DEFAULT_FRAMEWORK);
  if (!ownScoreRes.ok) return ownScoreRes;
  const yourScorePct = ownScoreRes.scorePct;

  const industryParticipants = await prisma.tenant.findMany({
    where: {
      id: { not: tid },
      industry: tenantIndustry,
      shareAnonymizedBenchmarks: true,
    },
    select: { id: true },
  });

  let cohortType: IndustryBenchmarkPayload["cohortType"] = "INDUSTRY";
  let participantIds = industryParticipants.map((t) => t.id);
  if (participantIds.length < IRONETHIC_MIN_COHORT) {
    cohortType = "BROAD_SECTOR";
    const broad = await prisma.tenant.findMany({
      where: {
        id: { not: tid },
        shareAnonymizedBenchmarks: true,
      },
      select: { id: true },
      take: 200,
    });
    participantIds = broad.map((t) => t.id);
  }

  const scoreRows = await Promise.all(
    participantIds.map(async (peerTid) => {
      const s = await getTenantUnderwriterReadinessScore(peerTid, DEFAULT_FRAMEWORK);
      return s.ok ? s.scorePct : null;
    }),
  );
  const peerScores = scoreRows.filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  const industryAvgPct = Math.round(mean(peerScores) * 100) / 100;
  const bucket = percentileBucket(yourScorePct, industryAvgPct);

  return {
    ok: true,
    payload: {
      benchmarkingEnabled: current.shareAnonymizedBenchmarks,
      tenantIndustry,
      cohortType,
      cohortSize: peerScores.length,
      yourScorePct,
      industryAvgPct,
      percentileBucket: bucket,
      insight:
        bucket === "Top 10"
          ? "You are leading your sector on underwriter readiness."
          : bucket === "Bottom"
            ? "You are trailing peer readiness; closing high-ALE gaps should improve renewal leverage."
            : "You are near the sector median; targeted control validation can move you above benchmark.",
    },
  };
}

export async function setShareAnonymizedBenchmarks(
  tenantUuid: string,
  enabled: boolean,
): Promise<{ ok: true; enabled: boolean } | { ok: false; error: string }> {
  const tid = tenantUuid.trim();
  if (!UUID_RE.test(tid)) return { ok: false, error: "Invalid tenant UUID." };
  await prisma.tenant.update({
    where: { id: tid },
    data: { shareAnonymizedBenchmarks: enabled },
  });
  return { ok: true, enabled };
}

export type IndustryTrendPoint = {
  weekLabel: string;
  weekStartIso: string;
  industryAleCents: string;
  localAleCents: string;
};

export type IndustryTrendPayload = {
  industry: string;
  points: IndustryTrendPoint[];
  /** True when ΔV = (ALE_avg(current) − ALE_avg(last)) / ALE_avg(last) > 0.20 */
  isMarketVolatile: boolean;
  /** Same ratio as ΔV, expressed as percent (e.g. 25.5 for +25.5%). */
  weekOverWeekChangePct: number | null;
  /** ΔV as a unitless ratio (e.g. 0.255); null if not computable. */
  marketVolatilityDeltaV: number | null;
  /** Idempotency key for auto-hardening: `{industry}:{latestSnapshotDate}`. */
  volatilityEpisodeKey: string | null;
};

/**
 * Last 8 weekly industry benchmark snapshots + tenant-local ALE series (scaled to industry movement).
 *
 * Volatility (ΔV): for the two most recent snapshots in chronological order,
 * ΔV = (ALE_avg(current) − ALE_avg(last)) / ALE_avg(last). Market is volatile when ΔV > 0.20.
 *
 * **Industry cohort:** snapshots are keyed by name in `MarketBenchmarkSnapshot.industry`.
 * - Omit `chartIndustry` → use {@link Tenant.industry} for the active tenant UUID (after Healthcare fallback).
 * - Pass `chartIndustry` (e.g. Industry Profile dropdown) → query that cohort so the chart updates when the UI changes.
 */
export async function getIndustryTrendData(
  tenantUuid: string,
  chartIndustry?: string | null,
): Promise<{ ok: true; payload: IndustryTrendPayload } | { ok: false; error: string }> {
  const tid = tenantUuid.trim();
  if (!UUID_RE.test(tid)) return { ok: false, error: "Invalid tenant UUID." };

  const tenant = await prisma.tenant.findUnique({
    where: { id: tid },
    select: { industry: true },
  });
  const industryFromTenant = resolveTenantIndustryForBenchmarks(tenant?.industry);
  const hasUiCohort = chartIndustry != null && chartIndustry.trim() !== "";
  const industry = hasUiCohort
    ? resolveTenantIndustryForBenchmarks(chartIndustry)
    : industryFromTenant;

  const windowStart = benchmarkSnapshotWindowStart();

  /** Scoped to UI cohort when provided, otherwise `Tenant.industry` (Healthcare fallback). */
  const snapshots = await prisma.marketBenchmarkSnapshot.findMany({
    where: {
      industry,
      timestamp: { gte: windowStart },
    },
    orderBy: { timestamp: "desc" },
    take: 8,
  });
  const chronological = [...snapshots].reverse();

  const companies = await prisma.company.findMany({
    where: { tenantId: tid },
    select: { id: true },
  });
  const companyIds = companies.map((c) => c.id);
  let localCurrentAle = 0n;
  if (companyIds.length > 0) {
    const agg = await prisma.riskEvent.aggregate({
      where: {
        tenantCompanyId: { in: companyIds },
        status: { not: ThreatState.CLOSED_ARCHIVED },
      },
      _sum: { financialRisk_cents: true },
    });
    localCurrentAle = agg._sum.financialRisk_cents ?? 0n;
  }

  const lastIndustry = chronological.length > 0 ? chronological[chronological.length - 1]!.averageAleCents : 0n;

  const points: IndustryTrendPoint[] = chronological.map((row) => {
    const localScaled =
      lastIndustry > 0n ? (localCurrentAle * row.averageAleCents) / lastIndustry : localCurrentAle;
    const d = row.timestamp;
    const weekStartIso = d.toISOString().slice(0, 10);
    return {
      weekLabel: weekStartIso,
      weekStartIso,
      industryAleCents: row.averageAleCents.toString(),
      localAleCents: localScaled.toString(),
    };
  });

  let weekOverWeekChangePct: number | null = null;
  let marketVolatilityDeltaV: number | null = null;
  let isMarketVolatile = false;
  const latestRow = chronological.length > 0 ? chronological[chronological.length - 1]! : null;
  const volatilityEpisodeKey =
    latestRow != null ? `${industry}:${latestRow.timestamp.toISOString().slice(0, 10)}` : null;

  if (chronological.length >= 2) {
    const prev = chronological[chronological.length - 2]!.averageAleCents;
    const last = chronological[chronological.length - 1]!.averageAleCents;
    if (prev > 0n) {
      const delta = last - prev;
      const prevN = Number(prev);
      const deltaVN = prevN > 0 ? Number(delta) / prevN : null;
      marketVolatilityDeltaV = deltaVN != null && Number.isFinite(deltaVN) ? deltaVN : null;
      weekOverWeekChangePct =
        deltaVN != null && Number.isFinite(deltaVN) ? Math.round(deltaVN * 10_000) / 100 : null;
      isMarketVolatile = deltaVN != null && deltaVN > 0.2;
    }
  }

  return {
    ok: true,
    payload: {
      industry,
      points,
      isMarketVolatile,
      weekOverWeekChangePct,
      marketVolatilityDeltaV,
      volatilityEpisodeKey,
    },
  };
}

export type SectorMarketStatus = "Stable" | "Hardening" | "Volatile";

export type SectorRiskTemperatureRow = {
  industry: string;
  currentMeanAleCents: string;
  wowVolatilityPct: number | null;
  marketStatus: SectorMarketStatus;
  /** WoW above 20% — matches volatility auto-harden threshold. */
  highVolatilityUnderwriterAlert: boolean;
};

function deriveSectorMarketStatus(wowPct: number | null): SectorMarketStatus {
  if (wowPct == null || !Number.isFinite(wowPct)) return "Stable";
  if (wowPct > 20) return "Volatile";
  if (wowPct > 5) return "Hardening";
  return "Stable";
}

/**
 * Evidence Vault sector view: latest Ironethic mean ALE + WoW per omni industry (MarketBenchmarkSnapshot).
 * Rows sorted by WoW volatility descending (hottest markets first).
 */
export async function getSectorRiskTemperature(): Promise<
  { ok: true; rows: SectorRiskTemperatureRow[] } | { ok: false; error: string }
> {
  const windowStart = benchmarkSnapshotWindowStart();

  const snapshots = await prisma.marketBenchmarkSnapshot.findMany({
    where: {
      industry: { in: [...OMNI_BENCHMARK_INDUSTRIES] },
      timestamp: { gte: windowStart },
    },
    orderBy: [{ industry: "asc" }, { timestamp: "desc" }],
  });

  const byIndustry = new Map<string, typeof snapshots>();
  for (const row of snapshots) {
    const list = byIndustry.get(row.industry) ?? [];
    list.push(row);
    byIndustry.set(row.industry, list);
  }

  const rows: SectorRiskTemperatureRow[] = [];

  for (const industry of OMNI_BENCHMARK_INDUSTRIES) {
    const list = byIndustry.get(industry) ?? [];
    const sorted = [...list].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const latest = sorted[0];
    const prev = sorted[1];

    let wowVolatilityPct: number | null = null;
    if (latest && prev && prev.averageAleCents > 0n) {
      const prevN = Number(prev.averageAleCents);
      const delta = Number(latest.averageAleCents - prev.averageAleCents);
      wowVolatilityPct = Math.round((delta / prevN) * 10_000) / 100;
    }

    const currentMeanAleCents = (latest?.averageAleCents ?? 0n).toString();
    const marketStatus = deriveSectorMarketStatus(wowVolatilityPct);
    const highVolatilityUnderwriterAlert =
      wowVolatilityPct != null && Number.isFinite(wowVolatilityPct) && wowVolatilityPct > 20;

    rows.push({
      industry,
      currentMeanAleCents,
      wowVolatilityPct,
      marketStatus,
      highVolatilityUnderwriterAlert,
    });
  }

  rows.sort((a, b) => {
    const aw = a.wowVolatilityPct;
    const bw = b.wowVolatilityPct;
    if (aw == null && bw == null) return a.industry.localeCompare(b.industry);
    if (aw == null) return 1;
    if (bw == null) return -1;
    if (bw !== aw) return bw - aw;
    return a.industry.localeCompare(b.industry);
  });

  return { ok: true, rows };
}
