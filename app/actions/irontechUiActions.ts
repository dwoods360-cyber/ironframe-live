"use server";

import prisma from "@/lib/prisma";
import { AgentOperationStatus } from "@prisma/client";

/** True while any operation is in internal AuditLog / AgentOperation scan phase (for Log-Dive UI). */
export async function getIrontechActiveLogDive(): Promise<boolean> {
  const rows = await prisma.agentOperation.findMany({
    where: {
      status: { in: [AgentOperationStatus.RETRYING, AgentOperationStatus.PENDING] },
    },
    take: 20,
    select: { snapshot: true },
  });
  for (const r of rows) {
    const s = r.snapshot as { diagnosticHierarchy?: { phase?: string } } | null;
    if (s?.diagnosticHierarchy?.phase === "internal_lookup") return true;
  }
  return false;
}
