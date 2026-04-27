"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { SIMULATION_CONFIG_ID } from "@/app/utils/simulationConfigConstants";
import { resolveIntegrityLedgerAuthorizedLabel } from "@/app/utils/serverAuth";

export async function getAutomatedUpdatesEnabled(): Promise<boolean> {
  const row = await prisma.simulationConfig.findUnique({
    where: { id: SIMULATION_CONFIG_ID },
    select: { automatedUpdatesEnabled: true },
  });
  return row?.automatedUpdatesEnabled ?? false;
}

async function appendGlobalNotificationsToggleAudit(next: boolean): Promise<void> {
  try {
    const { userId, displayName } = await resolveIntegrityLedgerAuthorizedLabel();
    const truth = next ? "True" : "False";
    await prisma.auditLog.create({
      data: {
        action: "GLOBAL_NOTIFICATIONS",
        justification: `Operator [${displayName}] changed GLOBAL_NOTIFICATIONS to ${truth}`,
        operatorId: userId,
        threatId: null,
        isSimulation: true,
      },
    });
  } catch (e) {
    console.error("[toggleAutomatedUpdates] audit append failed (config still saved)", e);
  }
}

/**
 * Persists the flipped value for automated stakeholder broadcasts (remediation Phase 1.5).
 * Appends an immutable `AuditLog` row (append-only; no UI to mutate historical config audits).
 */
export async function getTargetReadinessScore(): Promise<number> {
  const row = await prisma.simulationConfig.findUnique({
    where: { id: SIMULATION_CONFIG_ID },
    select: { targetReadinessScore: true },
  });
  return row?.targetReadinessScore ?? 90;
}

/**
 * Updates executive readiness threshold; logs `SYSTEM_EVENT` audit (immutable append-only).
 */
export async function updateTargetReadinessScore(
  value: number,
): Promise<{ ok: true; targetReadinessScore: number } | { ok: false; error: string }> {
  try {
    const clamped = Math.max(0, Math.min(100, Math.round(Number(value))));
    await prisma.simulationConfig.upsert({
      where: { id: SIMULATION_CONFIG_ID },
      create: ({
        id: SIMULATION_CONFIG_ID,
        automatedUpdatesEnabled: false,
        targetReadinessScore: clamped,
        isCertified: false,
        certifiedAt: null,
        certificateStatus: "IN_PROGRESS",
        certificateIssuedAt: null,
        historicalLowestScore: 100,
        historicalLowestRecordedAt: null,
      } as any),
      update: { targetReadinessScore: clamped },
    });
    try {
      const { userId, displayName } = await resolveIntegrityLedgerAuthorizedLabel();
      await prisma.auditLog.create({
        data: {
          action: "SYSTEM_EVENT",
          justification: `Operator [${displayName}] updated Readiness Target to ${clamped}.`,
          operatorId: userId,
          threatId: null,
          isSimulation: true,
        },
      });
    } catch (e) {
      console.error("[updateTargetReadinessScore] audit append failed", e);
    }
    revalidatePath("/board-report");
    revalidatePath("/integrity");
    return { ok: true, targetReadinessScore: clamped };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update readiness target";
    console.error("[updateTargetReadinessScore]", e);
    return { ok: false, error: message };
  }
}

export async function toggleAutomatedUpdates(): Promise<
  { ok: true; automatedUpdatesEnabled: boolean } | { ok: false; error: string }
> {
  try {
    const current = await prisma.simulationConfig.findUnique({
      where: { id: SIMULATION_CONFIG_ID },
      select: { automatedUpdatesEnabled: true },
    });
    const next = !(current?.automatedUpdatesEnabled ?? false);

    await prisma.simulationConfig.upsert({
      where: { id: SIMULATION_CONFIG_ID },
      create: ({
        id: SIMULATION_CONFIG_ID,
        automatedUpdatesEnabled: next,
        targetReadinessScore: 90,
        isCertified: false,
        certifiedAt: null,
        certificateStatus: "IN_PROGRESS",
        certificateIssuedAt: null,
        historicalLowestScore: 100,
        historicalLowestRecordedAt: null,
      } as any),
      update: { automatedUpdatesEnabled: next },
    });

    await appendGlobalNotificationsToggleAudit(next);

    revalidatePath("/integrity");
    return { ok: true, automatedUpdatesEnabled: next };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to toggle simulation config";
    console.error("[toggleAutomatedUpdates]", e);
    return { ok: false, error: message };
  }
}
