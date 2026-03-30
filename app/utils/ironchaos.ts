/**
 * Ironchaos: first-class agent-event injector — reads ChaosConfig and persists CHAOS_INTERRUPTED
 * on AgentOperation before the resilience loop surfaces failure (Attbot / mitigation testing).
 */
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { AgentOperationStatus } from "@prisma/client";
import { recordResilienceIntelStreamLine } from "@/app/actions/resilienceIntelStreamActions";

const CHAOS_GLOBAL_ID = "global";
const CHAOS_POISON_LEAD_MS = 2000;

export type ChaosInterruptEvent = {
  type: "CHAOS_INTERRUPT";
  attempt: number;
  at: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function isChaosActive(): Promise<boolean> {
  const cfg = await prisma.chaosConfig.findUnique({
    where: { id: CHAOS_GLOBAL_ID },
  });
  return cfg?.isActive === true;
}

/** Chaos drill threats: `ingestionDetails` JSON includes `{ "isChaosTest": true }`. */
export async function threatIsChaosTest(threatId: string): Promise<boolean> {
  const t = await prisma.threatEvent.findUnique({
    where: { id: threatId.trim() },
    select: { ingestionDetails: true },
  });
  if (!t?.ingestionDetails?.trim()) return false;
  try {
    const j = JSON.parse(t.ingestionDetails) as { isChaosTest?: boolean };
    return j.isChaosTest === true;
  } catch {
    return false;
  }
}

/**
 * When Ironchaos is ON: fixed delay → upsert operation row as CHAOS_INTERRUPTED, bump attemptCount,
 * append snapshot chaos event, push intelligence-stream line. Caller then throws to enter retry/catch.
 */
export async function poisonAgentOperationWithChaos(
  threatId: string,
  agentName: string,
  attemptNumber: number,
): Promise<void> {
  const tid = threatId.trim();
  const agent = agentName.trim();
  if (!tid || !agent) return;

  await sleep(CHAOS_POISON_LEAD_MS);

  const row = await prisma.agentOperation.findUnique({
    where: { threatId_agentName: { threatId: tid, agentName: agent } },
    select: { snapshot: true },
  });
  const prev =
    row?.snapshot && typeof row.snapshot === "object" && row.snapshot !== null
      ? (row.snapshot as Record<string, unknown>)
      : {};
  const raw = prev.chaosEvents;
  const chaosEvents: ChaosInterruptEvent[] = Array.isArray(raw)
    ? [...(raw as ChaosInterruptEvent[])]
    : [];
  chaosEvents.push({
    type: "CHAOS_INTERRUPT",
    attempt: attemptNumber,
    at: new Date().toISOString(),
  });

  const nextSnapshot: Record<string, unknown> = {
    ...prev,
    chaosEvents,
    lastAgentEvent: "CHAOS_INTERRUPTED",
  };

  const line = `> [IRONCHAOS] ⚡ Failure Payload injected into ${agent}.`;
  console.log(line);
  await recordResilienceIntelStreamLine(line, tid);

  await prisma.agentOperation.update({
    where: { threatId_agentName: { threatId: tid, agentName: agent } },
    data: {
      status: AgentOperationStatus.CHAOS_INTERRUPTED,
      attemptCount: attemptNumber,
      lastError: "CHAOS_INTERRUPTED",
      snapshot: nextSnapshot as Prisma.InputJsonValue,
    },
  });
}
