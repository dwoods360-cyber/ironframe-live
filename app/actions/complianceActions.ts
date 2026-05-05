"use server";

import { ThreatState } from "@prisma/client";
import prisma from "@/lib/prisma";
import { formatCentsToUSD } from "@/app/utils/formatCentsToUSD";
import { fetchInsuranceModelForTenant } from "@/app/utils/insuranceTenantModel";

export type CoverageFramework = "SOC2" | "ISO27001" | "NIST";

export type FrameworkGap = {
  controlId: string;
  validationCount: number;
  potentialAleExposureCents: string;
};

export type FrameworkCoverageResult = {
  framework: CoverageFramework;
  requiredControls: string[];
  validatedControlsCount: number;
  validatedControls: string[];
  readinessPercent: number;
  gaps: FrameworkGap[];
  totals: {
    requiredControls: number;
    validatedControls: number;
    gapControls: number;
    potentialAleExposureCents: string;
  };
};

const FRAMEWORK_REQUIRED_CONTROLS: Record<CoverageFramework, string[]> = {
  SOC2: [
    "SOC2 CC6.1",
    "SOC2 CC6.2",
    "SOC2 CC6.3",
    "SOC2 CC7.1",
    "SOC2 CC7.2",
    "SOC2 CC8.1",
  ],
  ISO27001: [
    "ISO27001 Annex A.5.1",
    "ISO27001 Annex A.5.7",
    "ISO27001 Annex A.8.2",
    "ISO27001 Annex A.8.16",
    "ISO27001 Annex A.8.28",
    "ISO27001 Annex A.8.32",
  ],
  NIST: [
    "NIST PR.AC-3",
    "NIST PR.AC-5",
    "NIST DE.CM-1",
    "NIST DE.CM-7",
    "NIST RS.AN-1",
    "NIST RS.MI-1",
  ],
};

const VALIDATED_LIFECYCLE_STATES: ThreatState[] = [
  ThreatState.MITIGATED,
  ThreatState.RESOLVED,
  ThreatState.CLOSED_ARCHIVED,
];

const OPEN_RISK_STATES: ThreatState[] = [ThreatState.IDENTIFIED, ThreatState.CONFIRMED];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeFramework(input: string): CoverageFramework {
  const u = input.trim().toUpperCase();
  if (u.includes("ISO")) return "ISO27001";
  if (u.includes("NIST")) return "NIST";
  return "SOC2";
}

/** Compute underwriter readiness for a tenant/framework pair, no gap payload. */
export async function getTenantUnderwriterReadinessScore(
  tenantUuid: string,
  framework: string,
): Promise<{ ok: true; scorePct: number } | { ok: false; error: string }> {
  const coverage = await getFrameworkCoverage(tenantUuid, framework);
  if (!coverage.ok) return coverage;
  return { ok: true, scorePct: coverage.coverage.readinessPercent };
}

export async function getFrameworkCoverage(
  tenantUuid: string,
  framework: string,
): Promise<{ ok: true; coverage: FrameworkCoverageResult } | { ok: false; error: string }> {
  const tid = tenantUuid.trim();
  if (!UUID_RE.test(tid)) return { ok: false, error: "Invalid tenant UUID." };
  const fw = normalizeFramework(framework);

  const companies = await prisma.company.findMany({
    where: { tenantId: tid },
    select: { id: true },
  });
  const companyIds = companies.map((c) => c.id);
  if (companyIds.length === 0) {
    return { ok: false, error: "No tenant companies found for coverage analysis." };
  }

  const yearStart = new Date();
  yearStart.setUTCMonth(0, 1);
  yearStart.setUTCHours(0, 0, 0, 0);

  const requiredControls = FRAMEWORK_REQUIRED_CONTROLS[fw];

  const validatedRows = await prisma.riskEvent.findMany({
    where: {
      tenantCompanyId: { in: companyIds },
      complianceFramework: fw,
      status: { in: VALIDATED_LIFECYCLE_STATES },
      updatedAt: { gte: yearStart },
    },
    select: {
      mappedControls: true,
    },
  });

  const validatedControlsSet = new Set<string>();
  for (const row of validatedRows) {
    for (const c of row.mappedControls) {
      if (requiredControls.includes(c)) validatedControlsSet.add(c);
    }
  }

  let gapsTotalExposure = 0n;
  const gaps: FrameworkGap[] = [];
  for (const controlId of requiredControls) {
    const validationCount = validatedRows.filter((r) => r.mappedControls.includes(controlId)).length;
    if (validationCount > 0) continue;

    const exposureAgg = await prisma.riskEvent.aggregate({
      where: {
        tenantCompanyId: { in: companyIds },
        complianceFramework: fw,
        status: { in: OPEN_RISK_STATES },
        OR: [{ mappedControls: { isEmpty: true } }, { NOT: { mappedControls: { has: controlId } } }],
      },
      _sum: { financialRisk_cents: true },
    });
    const potentialAle = exposureAgg._sum.financialRisk_cents ?? 0n;
    gapsTotalExposure += potentialAle;
    gaps.push({
      controlId,
      validationCount: 0,
      potentialAleExposureCents: potentialAle.toString(),
    });
  }

  gaps.sort((a, b) => {
    const av = BigInt(a.potentialAleExposureCents);
    const bv = BigInt(b.potentialAleExposureCents);
    if (av === bv) return a.controlId.localeCompare(b.controlId);
    return bv > av ? 1 : -1;
  });

  const validatedControls = [...validatedControlsSet].sort((a, b) => a.localeCompare(b));
  const readinessPercent =
    requiredControls.length > 0
      ? Math.round((validatedControls.length / requiredControls.length) * 10000) / 100
      : 0;

  return {
    ok: true,
    coverage: {
      framework: fw,
      requiredControls,
      validatedControlsCount: validatedControls.length,
      validatedControls,
      readinessPercent,
      gaps,
      totals: {
        requiredControls: requiredControls.length,
        validatedControls: validatedControls.length,
        gapControls: gaps.length,
        potentialAleExposureCents: gapsTotalExposure.toString(),
      },
    },
  };
}

export type RemediationCompanySlice = {
  companyId: string;
  companyName: string;
  aleContributionCents: string;
};

export type RankedRemediationTask = {
  rank: number;
  controlId: string;
  potentialAleExposureCents: string;
  /** Display label e.g. "$5.9M" — financial weight of this gap (ALE pool contribution). */
  financialWeightLabel: string;
  contributionByCompany: RemediationCompanySlice[];
  /** Company with largest ALE slice for Ironscribe narrative (e.g. Vaultbank Global). */
  primaryAssetLabel: string;
};

export type RankedRemediationPayload = {
  framework: CoverageFramework;
  tasks: RankedRemediationTask[];
  /** Ironscribe strategic line for HUD / gaps page. */
  strategicRecommendation: string;
  gapPoolTotalCents: string;
};

function gapExposureWhereClause(
  fw: CoverageFramework,
  controlId: string,
  companyId: bigint,
): Parameters<typeof prisma.riskEvent.aggregate>[0]["where"] {
  return {
    tenantCompanyId: companyId,
    complianceFramework: fw,
    status: { in: OPEN_RISK_STATES },
    OR: [{ mappedControls: { isEmpty: true } }, { NOT: { mappedControls: { has: controlId } } }],
  };
}

/**
 * Ironscribe-style ranked remediation: each gap’s weight is aggregate open-risk ALE (BigInt cents)
 * mapped across tenant companies (Medshield, Vaultbank, …), sorted by total contribution descending.
 */
export async function getRankedRemediationTasks(
  tenantUuid: string,
  frameworkOverride?: string,
): Promise<{ ok: true; payload: RankedRemediationPayload } | { ok: false; error: string }> {
  const tid = tenantUuid.trim();
  if (!UUID_RE.test(tid)) return { ok: false, error: "Invalid tenant UUID." };

  let fw: CoverageFramework;
  if (frameworkOverride?.trim()) {
    fw = normalizeFramework(frameworkOverride);
  } else {
    const model = await fetchInsuranceModelForTenant(tid);
    fw = normalizeFramework(model.framework);
  }

  const coverageRes = await getFrameworkCoverage(tid, fw);
  if (!coverageRes.ok) return coverageRes;

  const companies = await prisma.company.findMany({
    where: { tenantId: tid },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });

  const gapPoolTotalCents = coverageRes.coverage.totals.potentialAleExposureCents;
  const gapPoolBn = BigInt(gapPoolTotalCents || "0");

  const tasks: RankedRemediationTask[] = [];
  let rank = 1;
  for (const gap of coverageRes.coverage.gaps) {
    const slices: RemediationCompanySlice[] = [];
    for (const co of companies) {
      const agg = await prisma.riskEvent.aggregate({
        where: gapExposureWhereClause(fw, gap.controlId, co.id),
        _sum: { financialRisk_cents: true },
      });
      const cents = agg._sum.financialRisk_cents ?? 0n;
      if (cents <= 0n) continue;
      slices.push({
        companyId: co.id.toString(),
        companyName: co.name.trim() || `Company ${co.id}`,
        aleContributionCents: cents.toString(),
      });
    }
    slices.sort((a, b) => {
      const av = BigInt(a.aleContributionCents);
      const bv = BigInt(b.aleContributionCents);
      return av === bv ? 0 : bv > av ? 1 : -1;
    });
    const primary = slices[0];
    const primaryAssetLabel = primary?.companyName ?? "tenant workload";

    tasks.push({
      rank: rank++,
      controlId: gap.controlId,
      potentialAleExposureCents: gap.potentialAleExposureCents,
      financialWeightLabel: formatCentsToUSD(gap.potentialAleExposureCents),
      contributionByCompany: slices,
      primaryAssetLabel,
    });
  }

  tasks.sort((a, b) => {
    const av = BigInt(a.potentialAleExposureCents);
    const bv = BigInt(b.potentialAleExposureCents);
    if (av === bv) return a.controlId.localeCompare(b.controlId);
    return bv > av ? 1 : -1;
  });
  tasks.forEach((t, i) => {
    t.rank = i + 1;
  });

  let strategicRecommendation: string;
  if (tasks.length === 0) {
    strategicRecommendation =
      "🤖 [STRATEGIC_REMEDIATION] | No open control gaps detected for this framework — posture is clear for Ironscribe review.";
  } else {
    const top = tasks[0]!;
    const topAle = BigInt(top.potentialAleExposureCents);
    const pct =
      gapPoolBn > 0n
        ? Math.round((Number(topAle) / Number(gapPoolBn)) * 10000) / 100
        : 0;
    strategicRecommendation =
      `🤖 [STRATEGIC_REMEDIATION] | Validating control ${top.controlId} on ${top.primaryAssetLabel} will reduce the GRC Gap by ${top.financialWeightLabel} (${pct.toFixed(0)}%). This is your highest-leverage task for today.`;
  }

  return {
    ok: true,
    payload: {
      framework: fw,
      tasks,
      strategicRecommendation,
      gapPoolTotalCents,
    },
  };
}
