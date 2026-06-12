import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  calculateOutOfPocketExposure,
  calculateInsurancePremiumCents,
  calculateReadinessScore,
  recordReadinessHistoricalLowIfNeeded,
} from "@/lib/reporting/riskMetrics";
import { verifyAndUpdateResilienceCertification } from "@/lib/reporting/certification";
import { NOTIFICATION_CONFIG_AUDIT_ACTIONS } from "@/app/utils/notificationAuditSummary";
import { loadStrategicIntelForBoardReport } from "@/app/actions/strategicIntelResearchActions";

const MS_DAY = 86_400_000;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * MS_DAY);
}

/** `ThreatEvent.ingestionDetails` is `String?` — supports `contains`. */
function simLossThreatWhereSince(since: Date): Prisma.ThreatEventWhereInput {
  return {
    createdAt: { gte: since },
    OR: [
      { ingestionDetails: { contains: "SIM_LOSS", mode: "insensitive" } },
      { title: { contains: "SIM_LOSS", mode: "insensitive" } },
    ],
  };
}

/** `RiskEvent.ingestionDetails` is `Json?` — use `string_contains`, not `contains`. */
function simLossRiskWhereSince(since: Date): Prisma.RiskEventWhereInput {
  return {
    createdAt: { gte: since },
    OR: [
      { ingestionDetails: { string_contains: "SIM_LOSS" } },
      { title: { contains: "SIM_LOSS", mode: "insensitive" } },
    ],
  };
}

const LAB_REMEDIATED_THREAT_FILTER = {
  ingestionDetails: { contains: "labRemediation", mode: "insensitive" },
} satisfies Prisma.ThreatEventWhereInput;

const LAB_REMEDIATED_RISK_FILTER = {
  ingestionDetails: { string_contains: "labRemediation" },
} satisfies Prisma.RiskEventWhereInput;

const BOARD_GOVERNANCE_ACTIONS = [
  ...NOTIFICATION_CONFIG_AUDIT_ACTIONS,
  "LAB_RESTORATION_SUCCESS",
] as const;

export type BoardGovernanceRow = {
  id: string;
  action: string;
  justification: string | null;
  operatorId: string;
  createdAt: string;
};

export type SyntheticHeatRow = {
  id: string;
  name: string;
  role: string;
  clearanceLevel: number;
  monetaryValueCents: string;
  totalLossIncurredCents: string;
  lastAttackedAt: string | null;
  vulnerabilityScore: number;
  heatTier: "HIGH" | "WATCH" | "LOW";
  /** Level 5 with simulation touch or loss — VIP protection line item. */
  vipProtectionCritical: boolean;
};

export type BoardFinancialBlock = {
  totalCapitalAtRiskCents: string;
  simulatedBleed30dCents: string;
  recoveryRatePercent: number;
  simLossEventCount30d: number;
  remediatedThreatCount30d: number;
  /** Bar chart: aggregate exposure (sum monetaryValue). */
  exposureBeforeCents: string;
  /** Bar chart: residual after simulated loss (sum monetaryValue - totalLoss per row, floored at 0). */
  exposureAfterCents: string;
};

export type ReadinessStatusState = "OK" | "BREACHED";

export type BoardLessonLearned = {
  historicalLowestScore: number;
  historicalLowestRecordedAtIso: string | null;
  /** Readiness points above the recorded historical low (improvement since most vulnerable). */
  deltaSinceLow: number;
};

type SimulationConfigLessonRow = {
  targetReadinessScore: number;
  historicalLowestScore: number;
  historicalLowestRecordedAt: Date | null;
  isCertified: boolean;
  certifiedAt: Date | null;
  certificateStatus: "VALID" | "EXPIRED" | "IN_PROGRESS";
  certificateIssuedAt: Date | null;
  currentStreak: number;
  longestStreak: number;
  graceWindowStartedAt: Date | null;
  graceWindowExpiresAt: Date | null;
  successfulGraceRecoveries: number;
  isEliteOperator: boolean;
};

export type DailySnapshotPoint = {
  date: string;
  score: number;
  totalLossCents: string;
  premiumCents: string;
};

export type BoardInsuranceProjection = {
  currentPremiumCents: string;
  potentialSavingsCents: string;
  premiumTrendDirection: "UP" | "DOWN" | "FLAT";
  policyDeductibleCents: string;
  outOfPocketExposureCents: string;
  totalProjectedLossCents: string;
  netLiabilityCents: string;
  insuranceCoveredCents: string;
};

export type BoardResilienceStreak = {
  currentStreak: number;
  longestStreak: number;
  shieldActive: boolean;
  shieldDepleting: boolean;
  graceRemainingMinutes: number | null;
  successfulGraceRecoveries: number;
  isEliteOperator: boolean;
};

export type BoardFailureAnalysis = {
  primaryStreakKiller: "WEBHOOK_FAILURE" | "SCORE_DIP" | "VIP_BREACH" | "MANUAL_RESET" | "NONE";
  primarySharePercent: number;
  averageStreakLengthDays: number;
  bars: Array<{
    reason: "WEBHOOK_FAILURE" | "SCORE_DIP" | "VIP_BREACH" | "MANUAL_RESET";
    percent: number;
    count: number;
  }>;
  events: Array<{
    id: string;
    reason: "WEBHOOK_FAILURE" | "SCORE_DIP" | "VIP_BREACH" | "MANUAL_RESET";
    resetAtIso: string;
    lostStreakDays: number;
    isExcludedFromAnalytics: boolean;
    exclusionReason: string | null;
  }>;
};

export type BoardReportPayload = {
  readiness: ReturnType<typeof calculateReadinessScore>;
  financial: BoardFinancialBlock;
  synthetics: SyntheticHeatRow[];
  governance: BoardGovernanceRow[];
  /** Executive threshold from `SimulationConfig.targetReadinessScore` (default 90). */
  targetReadinessScore: number;
  currentReadinessScore: number;
  /** Global readiness vs target for Board Report chrome (and `useBoardReadinessStatusStore`). */
  statusState: ReadinessStatusState;
  /** Level-5 personas with non-null `lastAttackedAt` (simulation touch = vulnerable exec exposure). */
  criticalExposureCount: number;
  /** Last 7 `DailySnapshot` rows, oldest → newest (UTC calendar days). */
  trendSnapshots: DailySnapshotPoint[];
  /** Worst-ever readiness (from `SimulationConfig`) + improvement vs current. */
  lessonLearned: BoardLessonLearned;
  insuranceProjection: BoardInsuranceProjection;
  isCertified: boolean;
  certifiedAtIso: string | null;
  certificateStatus: "VALID" | "EXPIRED" | "IN_PROGRESS";
  certificateIssuedAtIso: string | null;
  certificateExpiresInDays: number | null;
  certificateRenewalStreakDays: number;
  executiveSummary: string;
  isApproved: boolean;
  approvedBy: string | null;
  approvedAtIso: string | null;
  resilienceStreak: BoardResilienceStreak;
  failureAnalysis: BoardFailureAnalysis;
  /** Infasys Strategic Intel Update corpus — LP-10/LP-16 agent priority context. */
  strategicIntelSnippet: string;
  strategicIntelManifestId: string | null;
};

async function loadReadinessInputs(now = new Date()) {
  const thirty = daysAgo(30);
  const seven = daysAgo(7);

  const simTouchOrLoss: Prisma.SyntheticEmployeeWhereInput = {
    OR: [{ lastAttackedAt: { not: null } }, { totalLossIncurred: { gt: 0n } }],
  };

  const [
    enabledEndpoints,
    failedProbes7d,
    restorations30d,
    successfulAttackStandardCount,
    successfulAttackVipCount,
    vipMaterialBreachCount,
    hardenedVipCount,
  ] = await Promise.all([
    prisma.notificationEndpoint.findMany({
      where: { isEnabled: true },
      select: { id: true, lastProbeAt: true, lastProbeOk: true },
    }),
    prisma.notificationEndpoint.count({
      where: {
        lastProbeAt: { gte: seven },
        lastProbeOk: false,
      },
    }),
    prisma.auditLog.count({
      where: {
        action: "LAB_RESTORATION_SUCCESS",
        createdAt: { gte: thirty },
      },
    }),
    prisma.syntheticEmployee.count({
      where: {
        clearanceLevel: { gte: 1, lte: 4 },
        ...simTouchOrLoss,
      },
    }),
    prisma.syntheticEmployee.count({
      where: {
        clearanceLevel: 5,
        ...simTouchOrLoss,
      },
    }),
    prisma.syntheticEmployee.count({
      where: { clearanceLevel: 5, totalLossIncurred: { gt: 0n } },
    }),
    prisma.syntheticEmployee.count({
      where: { clearanceLevel: 5, isHardened: true },
    }),
  ]);

  const anyEnabledWebhookStale = enabledEndpoints.some((ep) => {
    if (!ep.lastProbeAt || ep.lastProbeOk !== true) return true;
    return ep.lastProbeAt < thirty;
  });

  const readiness = calculateReadinessScore({
    hasEnabledWebhookWithoutRecentSuccess:
      enabledEndpoints.length > 0 && anyEnabledWebhookStale,
    failedConnectionTestsLast7Days: failedProbes7d,
    successfulRestorationsLast30Days: restorations30d,
    successfulAttackStandardCount,
    successfulAttackVipCount,
    hasVipMaterialBreach: vipMaterialBreachCount > 0,
    hardenedVipCount,
  });
  await recordReadinessHistoricalLowIfNeeded(readiness.score);
  return readiness;
}

async function loadPremiumInputs(readinessScore: number): Promise<{
  readinessScore: number;
  hasVipMaterialBreach: boolean;
  hardenedVipCount: number;
  totalVipCount: number;
}> {
  const [hardenedVipCount, vipMaterialBreachCount, totalVipCount] = await Promise.all([
    prisma.syntheticEmployee.count({ where: { clearanceLevel: 5, isHardened: true } }),
    prisma.syntheticEmployee.count({ where: { clearanceLevel: 5, totalLossIncurred: { gt: 0n } } }),
    prisma.syntheticEmployee.count({ where: { clearanceLevel: 5 } }),
  ]);
  return {
    readinessScore,
    hasVipMaterialBreach: vipMaterialBreachCount > 0,
    hardenedVipCount,
    totalVipCount,
  };
}

function heatTier(row: {
  monetaryValue: bigint;
  totalLossIncurred: bigint;
  lastAttackedAt: Date | null;
}): SyntheticHeatRow["heatTier"] {
  const thirty = daysAgo(30);
  const highValue = row.monetaryValue >= 50_000_000n;
  const attackedRecent = row.lastAttackedAt != null && row.lastAttackedAt >= thirty;
  const bleeding = row.totalLossIncurred > 0n;
  if (highValue && attackedRecent) return "HIGH";
  if (bleeding && attackedRecent) return "HIGH";
  if (bleeding || attackedRecent) return "WATCH";
  return "LOW";
}

async function loadFinancialBlock(): Promise<BoardFinancialBlock> {
  const thirty = daysAgo(30);

  const [capAgg, simThreatBleed, threatBleed, simLossCount, threatLossCount, remediatedSim, remediatedThreat] =
    await Promise.all([
      prisma.syntheticEmployee.aggregate({ _sum: { monetaryValue: true, totalLossIncurred: true } }),
      prisma.riskEvent.aggregate({
        where: simLossRiskWhereSince(thirty),
        _sum: { financialRisk_cents: true },
      }),
      prisma.threatEvent.aggregate({
        where: simLossThreatWhereSince(thirty),
        _sum: { financialRisk_cents: true },
      }),
      prisma.riskEvent.count({ where: simLossRiskWhereSince(thirty) }),
      prisma.threatEvent.count({ where: simLossThreatWhereSince(thirty) }),
      prisma.riskEvent.count({
        where: {
          updatedAt: { gte: thirty },
          ...LAB_REMEDIATED_RISK_FILTER,
        },
      }),
      prisma.threatEvent.count({
        where: {
          updatedAt: { gte: thirty },
          ...LAB_REMEDIATED_THREAT_FILTER,
        },
      }),
    ]);

  const totalCapital = capAgg._sum.monetaryValue ?? 0n;
  const totalLossCurrent = capAgg._sum.totalLossIncurred ?? 0n;
  const bleed =
    (simThreatBleed._sum.financialRisk_cents ?? 0n) + (threatBleed._sum.financialRisk_cents ?? 0n);

  const simLossEventCount30d = simLossCount + threatLossCount;
  const remediatedThreatCount30d = remediatedSim + remediatedThreat;

  const rows = await prisma.syntheticEmployee.findMany({
    select: { monetaryValue: true, totalLossIncurred: true },
  });
  let after = 0n;
  for (const r of rows) {
    const net = r.monetaryValue - r.totalLossIncurred;
    after += net > 0n ? net : 0n;
  }
  const exposureBefore = totalCapital;

  let recoveryRatePercent = 100;
  if (simLossEventCount30d > 0) {
    recoveryRatePercent = Math.round(
      Math.min(100, (remediatedThreatCount30d / simLossEventCount30d) * 100),
    );
  } else if (bleed > 0n && remediatedThreatCount30d === 0) {
    recoveryRatePercent = 0;
  }

  return {
    totalCapitalAtRiskCents: totalCapital.toString(),
    simulatedBleed30dCents: bleed.toString(),
    recoveryRatePercent,
    simLossEventCount30d,
    remediatedThreatCount30d,
    exposureBeforeCents: exposureBefore.toString(),
    exposureAfterCents: after.toString(),
  };
}

async function loadSyntheticHeat(): Promise<SyntheticHeatRow[]> {
  const rows = await prisma.syntheticEmployee.findMany({
    orderBy: [{ monetaryValue: "desc" }, { name: "asc" }],
    take: 48,
    select: {
      id: true,
      name: true,
      role: true,
      clearanceLevel: true,
      monetaryValue: true,
      totalLossIncurred: true,
      lastAttackedAt: true,
      vulnerabilityScore: true,
    },
  });
  return rows.map((r) => {
    const vipProtectionCritical =
      r.clearanceLevel === 5 &&
      (r.lastAttackedAt != null || r.totalLossIncurred > 0n);
    return {
      id: r.id,
      name: r.name,
      role: r.role,
      clearanceLevel: r.clearanceLevel,
      monetaryValueCents: r.monetaryValue.toString(),
      totalLossIncurredCents: r.totalLossIncurred.toString(),
      lastAttackedAt: r.lastAttackedAt?.toISOString() ?? null,
      vulnerabilityScore: r.vulnerabilityScore,
      heatTier: heatTier(r),
      vipProtectionCritical,
    };
  });
}

/** Current readiness score + sum of synthetic `totalLossIncurred` (for `DailySnapshot`). */
export async function getReadinessAndLossForSnapshot(): Promise<{
  score: number;
  totalLossCents: bigint;
  premiumCents: bigint;
}> {
  const readiness = await loadReadinessInputs();
  const premiumInput = await loadPremiumInputs(readiness.score);
  const premium = calculateInsurancePremiumCents({
    readinessScore: premiumInput.readinessScore,
    hardenedVipCount: premiumInput.hardenedVipCount,
    hasVipMaterialBreach: premiumInput.hasVipMaterialBreach,
  });
  const agg = await prisma.syntheticEmployee.aggregate({
    _sum: { totalLossIncurred: true },
  });
  const totalLossCents = agg._sum.totalLossIncurred ?? 0n;
  return { score: readiness.score, totalLossCents, premiumCents: premium.premiumCents };
}

async function loadLastSevenDailySnapshots(): Promise<DailySnapshotPoint[]> {
  const rows = (await prisma.dailySnapshot.findMany({
    orderBy: { date: "desc" },
    take: 7,
    select: { date: true, score: true, totalLossCents: true, premiumCents: true },
  } as any)) as unknown as Array<{
    date: Date;
    score: number;
    totalLossCents: bigint;
    premiumCents: bigint;
  }>;
  return rows
    .slice()
    .reverse()
    .map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      score: r.score,
      totalLossCents: r.totalLossCents.toString(),
      premiumCents: r.premiumCents.toString(),
    }));
}

function utcCalendarDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function loadExecutiveSummaryForToday(): Promise<string> {
  const today = utcCalendarDate(new Date());
  const row = (await prisma.dailySnapshot.findUnique({
    where: { date: today },
    select: { executiveSummary: true },
  } as any)) as { executiveSummary?: string | null } | null;
  return row?.executiveSummary?.trim() ?? "";
}

async function loadApprovalForToday(): Promise<{
  isApproved: boolean;
  approvedBy: string | null;
  approvedAtIso: string | null;
}> {
  const today = utcCalendarDate(new Date());
  const row = (await prisma.dailySnapshot.findUnique({
    where: { date: today },
    select: { isApproved: true, approvedBy: true, approvedAt: true },
  } as any)) as { isApproved?: boolean; approvedBy?: string | null; approvedAt?: Date | null } | null;
  return {
    isApproved: row?.isApproved === true,
    approvedBy: row?.approvedBy ?? null,
    approvedAtIso: row?.approvedAt?.toISOString() ?? null,
  };
}

async function loadGovernance(): Promise<BoardGovernanceRow[]> {
  const governanceWhere: Prisma.AuditLogWhereInput = {
    OR: [
      { action: { in: [...BOARD_GOVERNANCE_ACTIONS] } },
      {
        AND: [
          { action: "SYSTEM_EVENT" },
          { justification: { contains: "Readiness Target", mode: "insensitive" } },
        ],
      },
    ],
  };
  const rows = await prisma.auditLog.findMany({
    where: governanceWhere,
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      action: true,
      justification: true,
      operatorId: true,
      createdAt: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    justification: r.justification,
    operatorId: r.operatorId,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getBoardReportPayload(): Promise<BoardReportPayload> {
  const readiness = await loadReadinessInputs();
  const certification = await verifyAndUpdateResilienceCertification(readiness.score);
  const premiumInput = await loadPremiumInputs(readiness.score);
  const [financial, synthetics, governance, trendSnapshots, cfgRow, executiveSummary, approval, streakFailureLogs, strategicIntel] = await Promise.all([
    loadFinancialBlock(),
    loadSyntheticHeat(),
    loadGovernance(),
    loadLastSevenDailySnapshots(),
    prisma.simulationConfig.findUnique({
      where: { id: process.env.NEXT_PUBLIC_SIMULATION_CONFIG_ID || "default-config-id" },
      select: {
        targetReadinessScore: true,
        historicalLowestScore: true,
      }
    }),
    loadExecutiveSummaryForToday(),
    loadApprovalForToday(),
    ((prisma as any).streakFailureLog.findMany({
      orderBy: { resetAt: "desc" },
      take: 200,
      select: {
        id: true,
        reason: true,
        resetAt: true,
        lostStreakDays: true,
        isExcludedFromAnalytics: true,
        exclusionReason: true,
      },
    }) as Promise<Array<{
      id: string;
      reason: "WEBHOOK_FAILURE" | "SCORE_DIP" | "VIP_BREACH" | "MANUAL_RESET";
      resetAt: Date;
      lostStreakDays: number;
      isExcludedFromAnalytics: boolean;
      exclusionReason: string | null;
    }>>),
    loadStrategicIntelForBoardReport(),
  ]);
  const cfg = cfgRow as SimulationConfigLessonRow | null;
  const targetReadinessScore = cfg?.targetReadinessScore ?? 90;
  const historicalLowestScore = cfg?.historicalLowestScore ?? 100;
  const historicalLowestRecordedAtIso = cfg?.historicalLowestRecordedAt?.toISOString() ?? null;
  const currentReadinessScore = readiness.score;
  const statusState: ReadinessStatusState =
    currentReadinessScore < targetReadinessScore ? "BREACHED" : "OK";
  const criticalExposureCount = synthetics.filter(
    (s: SyntheticHeatRow) => s.clearanceLevel === 5 && s.lastAttackedAt != null,
  ).length;
  const lessonLearned: BoardLessonLearned = {
    historicalLowestScore,
    historicalLowestRecordedAtIso,
    deltaSinceLow: Math.max(0, currentReadinessScore - historicalLowestScore),
  };
  const premium = calculateInsurancePremiumCents({
    readinessScore: premiumInput.readinessScore,
    hardenedVipCount: premiumInput.hardenedVipCount,
    hasVipMaterialBreach: premiumInput.hasVipMaterialBreach,
  });
  const remainingVipCount = Math.max(0, premiumInput.totalVipCount - premiumInput.hardenedVipCount);
  const projectedReadinessAtFullHardening = Math.min(
    100,
    premiumInput.readinessScore + remainingVipCount * 2,
  );
  const projectedPremiumAtFullHardening = calculateInsurancePremiumCents({
    readinessScore: projectedReadinessAtFullHardening,
    hardenedVipCount: premiumInput.totalVipCount,
    hasVipMaterialBreach: premiumInput.hasVipMaterialBreach,
  });
  const potentialSavingsCents =
    premium.premiumCents > projectedPremiumAtFullHardening.premiumCents
      ? premium.premiumCents - projectedPremiumAtFullHardening.premiumCents
      : 0n;
  const latestSnapshotPremiumCents =
    trendSnapshots.length > 0 ? BigInt(trendSnapshots[trendSnapshots.length - 1].premiumCents) : null;
  const premiumTrendDirection: BoardInsuranceProjection["premiumTrendDirection"] =
    latestSnapshotPremiumCents == null
      ? "FLAT"
      : premium.premiumCents > latestSnapshotPremiumCents
        ? "UP"
        : premium.premiumCents < latestSnapshotPremiumCents
          ? "DOWN"
          : "FLAT";
  const insuranceProjection: BoardInsuranceProjection = {
    currentPremiumCents: premium.premiumCents.toString(),
    potentialSavingsCents: potentialSavingsCents.toString(),
    premiumTrendDirection,
    policyDeductibleCents: "0",
    outOfPocketExposureCents: "0",
    totalProjectedLossCents: "0",
    netLiabilityCents: "0",
    insuranceCoveredCents: "0",
  };
  const totalProjectedLossCents = BigInt(financial.simulatedBleed30dCents);
  const deductible = calculateOutOfPocketExposure(totalProjectedLossCents);
  const insuranceCoveredCents =
    totalProjectedLossCents > deductible.deductibleCents
      ? totalProjectedLossCents - deductible.deductibleCents
      : 0n;
  const netLiabilityCents =
    totalProjectedLossCents > deductible.deductibleCents
      ? totalProjectedLossCents - deductible.deductibleCents
      : 0n;
  insuranceProjection.policyDeductibleCents = deductible.deductibleCents.toString();
  insuranceProjection.outOfPocketExposureCents = deductible.outOfPocketExposureCents.toString();
  insuranceProjection.totalProjectedLossCents = totalProjectedLossCents.toString();
  insuranceProjection.netLiabilityCents = netLiabilityCents.toString();
  insuranceProjection.insuranceCoveredCents = insuranceCoveredCents.toString();
  const isCertified = cfg?.isCertified ?? certification.isCertified;
  const certifiedAtIso = (cfg?.certifiedAt ?? certification.certifiedAt)?.toISOString() ?? null;
  const certificateStatus = cfg?.certificateStatus ?? certification.certificateStatus;
  const certificateIssuedAtIso =
    (cfg?.certificateIssuedAt ?? certification.certificateIssuedAt)?.toISOString() ?? null;
  const certificateExpiresInDays = certification.expiresInDays;
  const certificateRenewalStreakDays = certification.renewalStreakDays;
  const resilienceStreak: BoardResilienceStreak = {
    currentStreak: cfg?.currentStreak ?? certification.currentStreak,
    longestStreak: cfg?.longestStreak ?? certification.longestStreak,
    shieldActive:
      (cfg?.currentStreak ?? certification.currentStreak) >= 50 || certification.shieldActive,
    shieldDepleting: certification.shieldDepleting,
    graceRemainingMinutes: certification.graceRemainingMinutes,
    successfulGraceRecoveries:
      cfg?.successfulGraceRecoveries ?? certification.successfulGraceRecoveries,
    isEliteOperator: cfg?.isEliteOperator ?? certification.isEliteOperator,
  };
  const failureTotals: Record<"WEBHOOK_FAILURE" | "SCORE_DIP" | "VIP_BREACH" | "MANUAL_RESET", number> = {
    WEBHOOK_FAILURE: 0,
    SCORE_DIP: 0,
    VIP_BREACH: 0,
    MANUAL_RESET: 0,
  };
  let totalResets = 0;
  let totalLostStreakDays = 0;
  for (const log of streakFailureLogs) {
    if (log.isExcludedFromAnalytics) continue;
    if (log.reason in failureTotals) {
      failureTotals[log.reason as keyof typeof failureTotals] += 1;
      totalResets += 1;
      totalLostStreakDays += Math.max(0, log.lostStreakDays);
    }
  }
  const reasonOrder: Array<keyof typeof failureTotals> = [
    "WEBHOOK_FAILURE",
    "SCORE_DIP",
    "VIP_BREACH",
    "MANUAL_RESET",
  ];
  const bars = reasonOrder.map((reason) => ({
    reason,
    count: failureTotals[reason],
    percent: totalResets > 0 ? Math.round((failureTotals[reason] / totalResets) * 100) : 0,
  }));
  const topBar = bars.slice().sort((a, b) => b.count - a.count)[0];
  const failureAnalysis: BoardFailureAnalysis = {
    primaryStreakKiller: topBar && topBar.count > 0 ? topBar.reason : "NONE",
    primarySharePercent: topBar && topBar.count > 0 ? topBar.percent : 0,
    averageStreakLengthDays: totalResets > 0 ? Math.round(totalLostStreakDays / totalResets) : 0,
    bars,
    events: streakFailureLogs.map((log) => ({
      id: log.id,
      reason: log.reason,
      resetAtIso: log.resetAt.toISOString(),
      lostStreakDays: log.lostStreakDays,
      isExcludedFromAnalytics: log.isExcludedFromAnalytics,
      exclusionReason: log.exclusionReason,
    })),
  };
  return {
    readiness,
    financial,
    synthetics,
    governance,
    targetReadinessScore,
    currentReadinessScore,
    statusState,
    criticalExposureCount,
    trendSnapshots,
    lessonLearned,
    insuranceProjection,
    isCertified,
    certifiedAtIso,
    certificateStatus,
    certificateIssuedAtIso,
    certificateExpiresInDays,
    certificateRenewalStreakDays,
    executiveSummary,
    isApproved: approval.isApproved,
    approvedBy: approval.approvedBy,
    approvedAtIso: approval.approvedAtIso,
    resilienceStreak,
    failureAnalysis,
    strategicIntelSnippet: strategicIntel.snippet,
    strategicIntelManifestId: strategicIntel.manifest?.manifestId ?? null,
  };
}
