"use server";

import prisma from "@/lib/prisma";
import { getTenantUnderwriterReadinessScore } from "@/app/actions/complianceActions";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IRONETHIC_MIN_COHORT = 5;
const DEFAULT_FRAMEWORK = "SOC2";

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

  const tenantIndustry = (current.industry ?? "").trim() || "General";
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
