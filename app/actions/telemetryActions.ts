"use server";

import { prismaAdmin } from "@/lib/prismaAdmin";

export type LiveAuditTelemetryRow = {
  id: string;
  createdAt: string;
  operator: string;
  botType: string;
  metadata: Record<string, unknown> | null;
};

/**
 * Lightweight live telemetry feed for Audit Intelligence.
 * Pulls latest BotAuditLog receipts for polling clients.
 */
export async function fetchLiveAuditTelemetry(): Promise<LiveAuditTelemetryRow[]> {
  const rows = await prismaAdmin.botAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      operator: true,
      botType: true,
      metadata: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    operator: row.operator,
    botType: row.botType,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null,
  }));
}

