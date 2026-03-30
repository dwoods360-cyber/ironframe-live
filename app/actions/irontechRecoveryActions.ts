"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { AgentOperationStatus, Prisma } from "@prisma/client";
import { triggerDeepTrace } from "@/app/actions/ironsightActions";

/**
 * GRC recovery: archive externally resolved work — audit trail + close agent operation row.
 */
export async function recoveryArchiveResolveAction(
  threatId: string,
  agentName: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const tid = threatId?.trim();
  const agent = agentName?.trim();
  if (!tid || !agent) {
    return { success: false, error: "Missing threat or agent context." };
  }
  try {
    await prisma.$transaction([
      prisma.auditLog.create({
        data: {
          action: "IRONTECH_RECOVERY_ARCHIVE",
          justification: `GRC-approved archive & resolve (external resolution). Agent: ${agent}.`,
          operatorId: "irontech-recovery",
          threatId: tid,
        },
      }),
      prisma.agentOperation.updateMany({
        where: { threatId: tid, agentName: agent },
        data: {
          status: AgentOperationStatus.COMPLETED,
          lastError: null,
        },
      }),
    ]);
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Ironsight validation scan (deep trace). */
export async function recoveryValidationScanAction(threatId: string) {
  return triggerDeepTrace(threatId?.trim() ?? "");
}

/**
 * Reset persisted operation so orchestration can run again; UI should resume agent heartbeat.
 */
export async function recoveryResumeOperationsAction(
  threatId: string,
  agentName: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const tid = threatId?.trim();
  const agent = agentName?.trim();
  if (!tid || !agent) {
    return { success: false, error: "Missing threat or agent context." };
  }
  try {
    await prisma.agentOperation.updateMany({
      where: { threatId: tid, agentName: agent },
      data: {
        status: AgentOperationStatus.PENDING,
        attemptCount: 0,
        lastError: null,
        snapshot: Prisma.JsonNull,
      },
    });
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
