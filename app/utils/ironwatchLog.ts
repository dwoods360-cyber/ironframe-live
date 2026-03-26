import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";

export type IronwatchSeverity = "INFO" | "WARN" | "ERROR";

/**
 * Persist a row to Ironwatch (Agent 13) for internal monitoring.
 * Never throws — failures are written to stderr only.
 */
export async function logIronwatch(params: {
  event_type: string;
  actor_id: string;
  detail: string;
  severity?: IronwatchSeverity;
}): Promise<void> {
  try {
    await prisma.ironwatchLog.create({
      data: {
        id: randomUUID(),
        event_type: params.event_type,
        actor_id: params.actor_id,
        detail: params.detail.slice(0, 8000),
        severity: params.severity ?? "INFO",
      },
    });
  } catch (err) {
    console.error("[Ironwatch] logIronwatch failed:", err);
  }
}
