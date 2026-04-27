import prisma from "@/lib/prisma";
import { SIMULATION_CONFIG_ID } from "@/app/utils/simulationConfigConstants";

type SimulationConfigCertificationRow = {
  isCertified: boolean;
  certifiedAt: Date | null;
  certificateStatus: "VALID" | "EXPIRED" | "IN_PROGRESS";
  certificateIssuedAt: Date | null;
  currentStreak: number;
  longestStreak: number;
  lastResetReason: "WEBHOOK_FAILURE" | "SCORE_DIP" | "VIP_BREACH" | "MANUAL_RESET" | null;
  graceWindowStartedAt: Date | null;
  graceWindowExpiresAt: Date | null;
  successfulGraceRecoveries: number;
  isEliteOperator: boolean;
};

type StreakProtectionState = {
  graceWindowStartedAt: Date | null;
  graceWindowExpiresAt: Date | null;
  keepStreakIntact: boolean;
  shieldActive: boolean;
  shieldDepleting: boolean;
  graceRemainingMinutes: number | null;
  shouldAuditTrigger: boolean;
  recoveredWithinGrace: boolean;
};

/**
 * 7-day resilience certification:
 * - Last 7 daily snapshots all score >= 95
 * - No VIP_BREACH markers in AuditLog over the same period
 * When first achieved, latches `SimulationConfig.isCertified=true` and writes SYSTEM_EVENT audit.
 */
const MS_DAY = 86_400_000;

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function utcCalendarDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function computeStreaksFromSnapshots(
  snapshotsDesc: Array<{ date: Date; score: number }>,
): { currentStreak: number; longestStreak: number } {
  if (snapshotsDesc.length === 0) return { currentStreak: 0, longestStreak: 0 };
  const snapshots = snapshotsDesc
    .slice()
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((s) => ({ date: utcCalendarDate(s.date), score: s.score }));

  let longestStreak = 0;
  let rolling = 0;
  let priorDateMs: number | null = null;
  for (const s of snapshots) {
    const dayMs = s.date.getTime();
    const contiguous = priorDateMs == null || dayMs - priorDateMs === MS_DAY;
    if (!contiguous) rolling = 0;
    if (s.score >= 95) rolling += 1;
    else rolling = 0;
    if (rolling > longestStreak) longestStreak = rolling;
    priorDateMs = dayMs;
  }

  let currentStreak = 0;
  for (let i = snapshots.length - 1; i >= 0; i -= 1) {
    const current = snapshots[i];
    if (current.score < 95) break;
    if (i < snapshots.length - 1) {
      const newer = snapshots[i + 1];
      if (newer.date.getTime() - current.date.getTime() !== MS_DAY) break;
    }
    currentStreak += 1;
  }
  return { currentStreak, longestStreak };
}

export function checkProtectionEligibility(input: {
  now: Date;
  priorCurrentStreak: number;
  currentReadinessScore: number;
  graceWindowStartedAt: Date | null;
  graceWindowExpiresAt: Date | null;
}): StreakProtectionState {
  const { now, priorCurrentStreak, currentReadinessScore } = input;
  const eligible = priorCurrentStreak >= 50;
  if (!eligible || currentReadinessScore >= 95) {
    const hasActiveGrace =
      currentReadinessScore >= 95 &&
      input.graceWindowStartedAt != null &&
      input.graceWindowExpiresAt != null &&
      now.getTime() <= input.graceWindowExpiresAt.getTime();
    return {
      graceWindowStartedAt: null,
      graceWindowExpiresAt: null,
      keepStreakIntact: false,
      shieldActive: eligible,
      shieldDepleting: false,
      graceRemainingMinutes: null,
      shouldAuditTrigger: false,
      recoveredWithinGrace: hasActiveGrace,
    };
  }
  const existingStart = input.graceWindowStartedAt;
  const existingEnd = input.graceWindowExpiresAt;
  if (existingStart && existingEnd && now.getTime() < existingEnd.getTime()) {
    const remainingMinutes = Math.max(0, Math.ceil((existingEnd.getTime() - now.getTime()) / 60_000));
    return {
      graceWindowStartedAt: existingStart,
      graceWindowExpiresAt: existingEnd,
      keepStreakIntact: true,
      shieldActive: true,
      shieldDepleting: true,
      graceRemainingMinutes: remainingMinutes,
      shouldAuditTrigger: false,
      recoveredWithinGrace: false,
    };
  }
  const startedAt = now;
  const expiresAt = new Date(now.getTime() + 120 * 60_000);
  return {
    graceWindowStartedAt: startedAt,
    graceWindowExpiresAt: expiresAt,
    keepStreakIntact: true,
    shieldActive: true,
    shieldDepleting: true,
    graceRemainingMinutes: 120,
    shouldAuditTrigger: true,
    recoveredWithinGrace: false,
  };
}

/**
 * Verifies certificate status with 30-day validity:
 * - VALID only when issued <= 30 days ago AND current readiness > 95.
 * - EXPIRED when issued date exceeds 30 days.
 * - Renewal requires a fresh 7-day clean streak (score >=95 and no VIP_BREACH each day).
 */
export async function verifyAndUpdateResilienceCertification(
  currentReadinessScore: number,
): Promise<
  SimulationConfigCertificationRow & {
    expiresInDays: number | null;
    renewalStreakDays: number;
    shieldActive: boolean;
    shieldDepleting: boolean;
    graceRemainingMinutes: number | null;
    successfulGraceRecoveries: number;
    isEliteOperator: boolean;
  }
> {
  const snapshots = (await prisma.dailySnapshot.findMany({
    orderBy: { date: "desc" },
    take: 30,
    select: { date: true, score: true },
  } as any)) as unknown as Array<{ date: Date; score: number }>;

  const cfg = (await prisma.simulationConfig.findUnique({
    where: { id: SIMULATION_CONFIG_ID },
    select: {
      isCertified: true,
      certifiedAt: true,
      certificateStatus: true,
      certificateIssuedAt: true,
      currentStreak: true,
      longestStreak: true,
      lastResetReason: true,
      graceWindowStartedAt: true,
      graceWindowExpiresAt: true,
      successfulGraceRecoveries: true,
      isEliteOperator: true,
    },
  } as any)) as SimulationConfigCertificationRow | null;

  const now = new Date();
  const minDate = snapshots.length > 0 ? snapshots[snapshots.length - 1].date : new Date(now.getTime() - 30 * MS_DAY);
  const vipBreachRows = await prisma.auditLog.findMany({
    where: {
      createdAt: { gte: minDate, lte: now },
      OR: [
        { action: { contains: "VIP_BREACH", mode: "insensitive" } },
        { justification: { contains: "VIP_BREACH", mode: "insensitive" } },
      ],
    },
    select: { createdAt: true },
  });
  const vipBreachDays = new Set(vipBreachRows.map((r) => utcDayKey(r.createdAt)));
  const todayUtcKey = utcDayKey(now);
  const hasVipBreachToday = vipBreachDays.has(todayUtcKey);

  let renewalStreakDays = 0;
  for (const s of snapshots) {
    if (s.score >= 95 && !vipBreachDays.has(utcDayKey(s.date))) renewalStreakDays += 1;
    else break;
  }
  const qualifiesFreshStreak = renewalStreakDays >= 7;
  const streaks = computeStreaksFromSnapshots(snapshots);
  const protection = checkProtectionEligibility({
    now,
    priorCurrentStreak: cfg?.currentStreak ?? streaks.currentStreak,
    currentReadinessScore,
    graceWindowStartedAt: cfg?.graceWindowStartedAt ?? null,
    graceWindowExpiresAt: cfg?.graceWindowExpiresAt ?? null,
  });
  const graceExpiredStillLow =
    currentReadinessScore < 95 &&
    (cfg?.currentStreak ?? 0) >= 50 &&
    cfg?.graceWindowExpiresAt != null &&
    now.getTime() >= cfg.graceWindowExpiresAt.getTime();
  const enabledEndpoints = await prisma.notificationEndpoint.findMany({
    where: { isEnabled: true },
    select: { lastProbeAt: true, lastProbeOk: true },
  });
  const hasWebhookFailure =
    enabledEndpoints.length > 0 &&
    enabledEndpoints.some((ep) => {
      if (ep.lastProbeOk !== true || !ep.lastProbeAt) return true;
      return now.getTime() - ep.lastProbeAt.getTime() > 30 * MS_DAY;
    });
  const primaryResetReason: "WEBHOOK_FAILURE" | "SCORE_DIP" | "VIP_BREACH" | "MANUAL_RESET" =
    hasVipBreachToday
      ? "VIP_BREACH"
      : currentReadinessScore < 95
        ? "SCORE_DIP"
        : hasWebhookFailure
          ? "WEBHOOK_FAILURE"
          : "MANUAL_RESET";

  const issuedAt = cfg?.certificateIssuedAt ?? null;
  const issuedWithin30Days = issuedAt != null && now.getTime() - issuedAt.getTime() <= 30 * MS_DAY;
  const readinessAbove95 = currentReadinessScore > 95;

  let nextStatus: "VALID" | "EXPIRED" | "IN_PROGRESS" = cfg?.certificateStatus ?? "IN_PROGRESS";
  let nextIssuedAt = issuedAt;
  let nextCertifiedAt = cfg?.certifiedAt ?? null;
  let shouldAuditRenewal = false;

  if (issuedAt != null && !issuedWithin30Days) {
    nextStatus = "EXPIRED";
  } else if (issuedWithin30Days && readinessAbove95) {
    nextStatus = "VALID";
  } else if (issuedWithin30Days && !readinessAbove95) {
    nextStatus = "IN_PROGRESS";
  }

  if ((nextStatus === "EXPIRED" || nextStatus === "IN_PROGRESS") && qualifiesFreshStreak) {
    nextStatus = "VALID";
    nextIssuedAt = now;
    nextCertifiedAt = now;
    shouldAuditRenewal = true;
  }

  const nextIsCertified = nextStatus === "VALID";
  const prevStatus = cfg?.certificateStatus ?? "IN_PROGRESS";
  const effectiveCurrentStreak = protection.keepStreakIntact
    ? Math.max(streaks.currentStreak, cfg?.currentStreak ?? 0)
    : graceExpiredStillLow
      ? 0
      : streaks.currentStreak;
  const effectiveLongestStreak = Math.max(streaks.longestStreak, cfg?.longestStreak ?? 0);
  const nextSuccessfulGraceRecoveries =
    (cfg?.successfulGraceRecoveries ?? 0) + (protection.recoveredWithinGrace ? 1 : 0);
  const nextIsEliteOperator = (cfg?.isEliteOperator ?? false) || nextSuccessfulGraceRecoveries >= 5;
  const changed =
    cfg == null ||
    prevStatus !== nextStatus ||
    cfg.isCertified !== nextIsCertified ||
    (cfg.certificateIssuedAt?.toISOString() ?? null) !== (nextIssuedAt?.toISOString() ?? null) ||
    (cfg.certifiedAt?.toISOString() ?? null) !== (nextCertifiedAt?.toISOString() ?? null) ||
    (cfg.currentStreak ?? 0) !== effectiveCurrentStreak ||
    (cfg.longestStreak ?? 0) !== effectiveLongestStreak ||
    (cfg.lastResetReason ?? null) !== (effectiveCurrentStreak === 0 ? primaryResetReason : cfg?.lastResetReason ?? null) ||
    (cfg.graceWindowStartedAt?.toISOString() ?? null) !== (protection.graceWindowStartedAt?.toISOString() ?? null) ||
    (cfg.graceWindowExpiresAt?.toISOString() ?? null) !== (protection.graceWindowExpiresAt?.toISOString() ?? null) ||
    (cfg.successfulGraceRecoveries ?? 0) !== nextSuccessfulGraceRecoveries ||
    (cfg.isEliteOperator ?? false) !== nextIsEliteOperator;

  const shouldLogReset = (cfg?.currentStreak ?? 0) > 0 && effectiveCurrentStreak === 0;
  const nextLastResetReason =
    shouldLogReset || effectiveCurrentStreak === 0 ? primaryResetReason : cfg?.lastResetReason ?? null;

  if (changed || shouldAuditRenewal) {
    const writes: Array<any> = [
      prisma.simulationConfig.upsert({
        where: { id: SIMULATION_CONFIG_ID },
        create: ({
          id: SIMULATION_CONFIG_ID,
          automatedUpdatesEnabled: false,
          targetReadinessScore: 90,
          historicalLowestScore: 100,
          historicalLowestRecordedAt: null,
          currentStreak: effectiveCurrentStreak,
          longestStreak: effectiveLongestStreak,
          lastResetReason: nextLastResetReason,
          graceWindowStartedAt: protection.graceWindowStartedAt,
          graceWindowExpiresAt: protection.graceWindowExpiresAt,
          successfulGraceRecoveries: nextSuccessfulGraceRecoveries,
          isEliteOperator: nextIsEliteOperator,
          isCertified: nextIsCertified,
          certifiedAt: nextCertifiedAt,
          certificateStatus: nextStatus,
          certificateIssuedAt: nextIssuedAt,
        } as any),
        update: ({
          isCertified: nextIsCertified,
          certifiedAt: nextCertifiedAt,
          certificateStatus: nextStatus,
          certificateIssuedAt: nextIssuedAt,
          currentStreak: effectiveCurrentStreak,
          longestStreak: effectiveLongestStreak,
          lastResetReason: nextLastResetReason,
          graceWindowStartedAt: protection.graceWindowStartedAt,
          graceWindowExpiresAt: protection.graceWindowExpiresAt,
          successfulGraceRecoveries: nextSuccessfulGraceRecoveries,
          isEliteOperator: nextIsEliteOperator,
        } as any),
      }),
    ];
    if (protection.shouldAuditTrigger) {
      writes.push(
        prisma.auditLog.create({
          data: {
            action: "SYSTEM_EVENT",
            justification: "Streak Protection triggered for Operator. Grace window initiated.",
            operatorId: "COMPLIANCE_ENGINE",
            threatId: null,
            isSimulation: true,
          },
        }),
      );
    }
    if (shouldLogReset) {
      writes.push(
        (prisma as any).streakFailureLog.create({
          data: {
            reason: primaryResetReason,
            resetAt: now,
            lostStreakDays: cfg?.currentStreak ?? 0,
          },
        }),
      );
    }
    if (shouldAuditRenewal) {
      writes.push(
        prisma.auditLog.create({
          data: {
            action: "SYSTEM_EVENT",
            justification: "Compliance Milestone Reached: 7-Day Resilience Certified.",
            operatorId: "COMPLIANCE_ENGINE",
            threatId: null,
            isSimulation: true,
          },
        }),
      );
    }
    await prisma.$transaction(writes);
  }

  const expiresInDays =
    nextStatus === "VALID" && nextIssuedAt != null
      ? Math.max(0, 30 - Math.floor((now.getTime() - nextIssuedAt.getTime()) / MS_DAY))
      : null;

  return {
    isCertified: nextIsCertified,
    certifiedAt: nextCertifiedAt,
    certificateStatus: nextStatus,
    certificateIssuedAt: nextIssuedAt,
    currentStreak: effectiveCurrentStreak,
    longestStreak: effectiveLongestStreak,
    lastResetReason: nextLastResetReason,
    graceWindowStartedAt: protection.graceWindowStartedAt,
    graceWindowExpiresAt: protection.graceWindowExpiresAt,
    successfulGraceRecoveries: nextSuccessfulGraceRecoveries,
    isEliteOperator: nextIsEliteOperator,
    expiresInDays,
    renewalStreakDays,
    shieldActive: protection.shieldActive,
    shieldDepleting: protection.shieldDepleting,
    graceRemainingMinutes: protection.graceRemainingMinutes,
  };
}
