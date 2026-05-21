"use server";

import prisma from "@/lib/prisma";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

export type RecordAgentComputeInput = {
  tenantId: string;
  agentId: string;
  durationMs: number;
  tokensIn: number;
  tokensOut: number;
  operationType: string;
};

/** Persist agentic compute for billing / audit (partitioned `agent_compute_log`). */
export async function recordAgentComputeUsage(input: RecordAgentComputeInput): Promise<void> {
  const tid = input.tenantId?.trim();
  if (!tid) return;
  const op = input.operationType?.trim().slice(0, 120) || "UNKNOWN";
  const aid = input.agentId?.trim().slice(0, 64) || "0";
  const ms = Math.max(0, Math.min(2_147_483_647, Math.floor(input.durationMs)));
  const tin = Math.max(0, Math.min(2_147_483_647, Math.floor(input.tokensIn)));
  const tout = Math.max(0, Math.min(2_147_483_647, Math.floor(input.tokensOut)));

  await prisma.agentComputeLog.create({
    data: {
      tenantId: tid,
      agentId: aid,
      durationMs: ms,
      tokensIn: tin,
      tokensOut: tout,
      operationType: op,
    },
  });
}

export type AgentComputeLogRow = {
  id: string;
  agentId: string;
  durationMs: number;
  tokensIn: number;
  tokensOut: number;
  operationType: string;
  createdAt: string;
};

/** Recent compute rows for the active dashboard tenant (Resource Monitor). */
export async function listRecentAgentComputeLogsForTenant(
  take = 24,
): Promise<AgentComputeLogRow[] | { error: string }> {
  const tenantUuid = await getActiveTenantUuidFromCookies();
  if (!tenantUuid?.trim()) return { error: "Missing tenant context." };

  const rows = await prisma.agentComputeLog.findMany({
    where: { tenantId: tenantUuid.trim() },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(take, 1), 100),
    select: {
      id: true,
      agentId: true,
      durationMs: true,
      tokensIn: true,
      tokensOut: true,
      operationType: true,
      createdAt: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    agentId: r.agentId,
    durationMs: r.durationMs,
    tokensIn: r.tokensIn,
    tokensOut: r.tokensOut,
    operationType: r.operationType,
    createdAt: r.createdAt.toISOString(),
  }));
}
