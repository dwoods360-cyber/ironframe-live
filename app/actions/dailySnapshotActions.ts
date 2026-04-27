"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { getReadinessAndLossForSnapshot } from "@/lib/reporting/boardReportQueries";
import {
  getSupabaseSessionUser,
  resolveIntegrityLedgerAuthorizedLabel,
  userEligibleForRemoteAccessToggle,
} from "@/app/utils/serverAuth";

const MS_DAY = 86_400_000;

function utcCalendarDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Persists today’s (UTC) operational readiness score and aggregate synthetic loss for the Board Report trend.
 */
export async function captureDailySnapshot(): Promise<
  { ok: true; date: string; score: number } | { ok: false; error: string }
> {
  try {
    const { score, totalLossCents, premiumCents } = await getReadinessAndLossForSnapshot();
    const date = utcCalendarDate(new Date());
    await prisma.dailySnapshot.upsert(({
      where: { date },
      create: { date, score, totalLossCents, premiumCents },
      update: { score, totalLossCents, premiumCents },
    } as any));
    revalidatePath("/board-report");
    return { ok: true, date: date.toISOString().slice(0, 10), score };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Snapshot failed";
    console.error("[captureDailySnapshot]", e);
    return { ok: false, error: message };
  }
}

/**
 * Dev-only: seed or overwrite the last 7 UTC calendar days with randomized scores for chart QA.
 */
export async function simulateSevenDayHistory(): Promise<
  { ok: true; daysWritten: number } | { ok: false; error: string }
> {
  if (process.env.NODE_ENV !== "development") {
    return { ok: false, error: "simulateSevenDayHistory is only available in development." };
  }
  try {
    let n = 0;
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(Date.now() - i * MS_DAY);
      const date = utcCalendarDate(d);
      const score = 42 + Math.floor(Math.random() * 52);
      const totalLossCents = BigInt(Math.floor(Math.random() * 120_000_000));
      const premiumCents = BigInt((100 + (100 - score) * 2) * 100_000);
      await prisma.dailySnapshot.upsert(({
        where: { date },
        create: { date, score, totalLossCents, premiumCents },
        update: { score, totalLossCents, premiumCents },
      } as any));
      n += 1;
    }
    revalidatePath("/board-report");
    return { ok: true, daysWritten: n };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Simulation failed";
    console.error("[simulateSevenDayHistory]", e);
    return { ok: false, error: message };
  }
}

export async function saveExecutiveSummaryForToday(
  summary: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const text = summary.trim().slice(0, 10_000);
    const date = utcCalendarDate(new Date());
    await prisma.dailySnapshot.upsert(({
      where: { date },
      create: {
        date,
        score: 100,
        totalLossCents: 0n,
        premiumCents: 0n,
        executiveSummary: text,
        isApproved: false,
        approvedBy: null,
        approvedAt: null,
      },
      update: {
        executiveSummary: text,
        isApproved: false,
        approvedBy: null,
        approvedAt: null,
      },
    } as any));
    revalidatePath("/board-report");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save executive summary";
    console.error("[saveExecutiveSummaryForToday]", e);
    return { ok: false, error: message };
  }
}

export async function approveBoardCommentary(): Promise<
  { ok: true; approvedBy: string; approvedAtIso: string } | { ok: false; error: string }
> {
  const user = await getSupabaseSessionUser();
  if (!user) return { ok: false, error: "Sign in required." };
  if (!userEligibleForRemoteAccessToggle(user)) {
    return { ok: false, error: "Requires CISO or Global Admin authority." };
  }
  try {
    const date = utcCalendarDate(new Date());
    const approvedAt = new Date();
    const approver = user.email?.trim() || user.id || UserRole.GLOBAL_ADMIN;
    await prisma.dailySnapshot.upsert(({
      where: { date },
      create: {
        date,
        score: 100,
        totalLossCents: 0n,
        premiumCents: 0n,
        executiveSummary: "",
        isApproved: true,
        approvedBy: approver,
        approvedAt,
      },
      update: {
        isApproved: true,
        approvedBy: approver,
        approvedAt,
      },
    } as any));
    try {
      const { displayName, userId } = await resolveIntegrityLedgerAuthorizedLabel();
      await prisma.auditLog.create({
        data: {
          action: "SYSTEM_EVENT",
          justification: `Board Report commentary approved by ${displayName}.`,
          operatorId: userId,
          threatId: null,
          isSimulation: true,
        },
      });
    } catch (auditErr) {
      console.error("[approveBoardCommentary] audit append failed", auditErr);
    }
    revalidatePath("/board-report");
    return { ok: true, approvedBy: approver, approvedAtIso: approvedAt.toISOString() };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Approval failed";
    console.error("[approveBoardCommentary]", e);
    return { ok: false, error: message };
  }
}

export async function toggleFailureExclusion(
  logId: string,
  nextExcluded: boolean,
  exclusionReason: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSupabaseSessionUser();
  if (!user) return { ok: false, error: "Sign in required." };
  if (!userEligibleForRemoteAccessToggle(user)) {
    return { ok: false, error: "Requires CISO or Global Admin authority." };
  }
  const trimmedReason = exclusionReason.trim().slice(0, 256);
  if (nextExcluded && trimmedReason.length < 3) {
    return { ok: false, error: "Exclusion Reason is required (min 3 characters)." };
  }
  try {
    await (prisma as any).streakFailureLog.update({
      where: { id: logId },
      data: {
        isExcludedFromAnalytics: nextExcluded,
        exclusionReason: nextExcluded ? trimmedReason : null,
      },
    });
    try {
      const { displayName, userId } = await resolveIntegrityLedgerAuthorizedLabel();
      await prisma.auditLog.create({
        data: {
          action: "SYSTEM_EVENT",
          justification: nextExcluded
            ? `Streak failure excluded from analytics by ${displayName}: ${trimmedReason}`
            : `Streak failure re-included in analytics by ${displayName}.`,
          operatorId: userId,
          threatId: null,
          isSimulation: true,
        },
      });
    } catch (auditErr) {
      console.error("[toggleFailureExclusion] audit append failed", auditErr);
    }
    revalidatePath("/board-report");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to toggle exclusion";
    console.error("[toggleFailureExclusion]", e);
    return { ok: false, error: message };
  }
}
