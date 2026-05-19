import "server-only";

import prisma from "@/lib/prisma";
import { computeSustainabilityStaleLockdown } from "@/app/config/sustainabilityStaleLockdown";

export type IrontechFreezeEngineSnapshot = {
  /** True when sustainability live API degraded ≥24h and no tripartite stale-data waiver. */
  isSystemFrozen: boolean;
  staleDataLockdownWindow: boolean;
  hoursDegraded: number | null;
  degradedSinceIso: string | null;
  /** Wall-clock ms since `sustainabilityApiDegradedSince`, when degraded. */
  degradedDurationMs: number | null;
};

/**
 * Irontech (Agent 12) freeze engine — central read for middleware + internal gates.
 * `isSystemFrozen` drives Ironlock-style read-only enforcement (`lockdown` in stale-lockdown-status).
 */
export async function getIrontechFreezeEngineSnapshot(
  nowMs: number = Date.now(),
): Promise<IrontechFreezeEngineSnapshot> {
  const row = await prisma.systemConfig.findUnique({
    where: { id: "global" },
    select: {
      sustainabilityLiveApiDegraded: true,
      sustainabilityApiDegradedSince: true,
      sustainabilityStaleLockdownWaived: true,
    },
  });
  const lock = computeSustainabilityStaleLockdown(row, nowMs);
  const since = row?.sustainabilityApiDegradedSince;
  const degradedDurationMs =
    row?.sustainabilityLiveApiDegraded === true && since ? nowMs - since.getTime() : null;
  return {
    isSystemFrozen: lock.blockingMutations,
    staleDataLockdownWindow: lock.staleDataLockdownWindow,
    hoursDegraded: lock.hoursDegraded,
    degradedSinceIso: since?.toISOString() ?? null,
    degradedDurationMs,
  };
}
