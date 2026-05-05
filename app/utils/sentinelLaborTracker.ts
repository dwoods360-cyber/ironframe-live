import type { Prisma } from "@prisma/client";

/** Human-equivalency constant: k cycles (weighted) ≈ 1 human forensic hour. */
export const MHE_CYCLES_PER_HUMAN_HOUR = 100;

/** Depth factor D_i — higher for heavier forensic work (19-agent roster subset used for sentinel monitoring). */
export const AGENT_DEPTH_FACTOR: Record<string, number> = {
  Ironsight: 1.35,
  Ironwatch: 1.2,
  Ironscout: 1.05,
  Ironlock: 1.25,
  Ironscribe: 1.4,
};

export function depthFactorForAgent(agentName: string): number {
  return AGENT_DEPTH_FACTOR[agentName] ?? 1.0;
}

export type SentinelLaborTrackerState = {
  totalReasoningCycles: number;
  byAgent: Record<string, number>;
  lastUpdatedAt?: string;
  finalizedAt?: string;
  totalReasoningCyclesAtClose?: number;
  weightedCycleUnits?: number;
  mheHumanHours?: number;
  scoutPollingCyclesAddedAtClose?: number;
};

export function parseLaborTracker(raw: unknown): SentinelLaborTrackerState {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const byAgent: Record<string, number> = {};
    if (o.byAgent && typeof o.byAgent === "object" && !Array.isArray(o.byAgent)) {
      for (const [k, v] of Object.entries(o.byAgent as Record<string, unknown>)) {
        const n = typeof v === "number" ? v : Number(v);
        if (Number.isFinite(n) && n > 0) byAgent[k] = Math.floor(n);
      }
    }
    const total =
      typeof o.totalReasoningCycles === "number" && Number.isFinite(o.totalReasoningCycles)
        ? Math.max(0, Math.floor(o.totalReasoningCycles))
        : Object.values(byAgent).reduce((s, c) => s + c, 0);
    return {
      totalReasoningCycles: total,
      byAgent,
      lastUpdatedAt: typeof o.lastUpdatedAt === "string" ? o.lastUpdatedAt : undefined,
      finalizedAt: typeof o.finalizedAt === "string" ? o.finalizedAt : undefined,
      totalReasoningCyclesAtClose:
        typeof o.totalReasoningCyclesAtClose === "number" ? o.totalReasoningCyclesAtClose : undefined,
      weightedCycleUnits:
        typeof o.weightedCycleUnits === "number" ? o.weightedCycleUnits : undefined,
      mheHumanHours: typeof o.mheHumanHours === "number" ? o.mheHumanHours : undefined,
      scoutPollingCyclesAddedAtClose:
        typeof o.scoutPollingCyclesAddedAtClose === "number"
          ? o.scoutPollingCyclesAddedAtClose
          : undefined,
    };
  }
  return { totalReasoningCycles: 0, byAgent: {} };
}

/** MHE = Σ(R_i × D_i) / k */
export function computeMheHumanHours(byAgent: Record<string, number>): number {
  let weighted = 0;
  for (const [agent, r] of Object.entries(byAgent)) {
    if (!Number.isFinite(r) || r <= 0) continue;
    weighted += r * depthFactorForAgent(agent);
  }
  return weighted / MHE_CYCLES_PER_HUMAN_HOUR;
}

export function bumpSentinelLaborTracker(
  rawLabor: unknown,
  agentName: string,
  cycles: number,
): Prisma.JsonObject {
  const canon = agentName.trim();
  if (!canon || !Number.isFinite(cycles) || cycles <= 0) {
    const cur = parseLaborTracker(rawLabor);
    return { ...cur, lastUpdatedAt: new Date().toISOString() } as unknown as Prisma.JsonObject;
  }
  const c = Math.floor(cycles);
  const cur = parseLaborTracker(rawLabor);
  const byAgent = { ...cur.byAgent };
  byAgent[canon] = (byAgent[canon] ?? 0) + c;
  const totalReasoningCycles = cur.totalReasoningCycles + c;
  return {
    totalReasoningCycles,
    byAgent,
    lastUpdatedAt: new Date().toISOString(),
  } as Prisma.JsonObject;
}

/** High-frequency observation ticks credited at closure from elapsed monitoring window. */
export const SCOUT_POLLS_PER_HOUR = 4;

export function finalizeSentinelLaborAtClose(
  ingestion: Record<string, unknown>,
  closedAt: Date,
): Prisma.JsonObject {
  const dm =
    ingestion.deepMonitoring &&
    typeof ingestion.deepMonitoring === "object" &&
    !Array.isArray(ingestion.deepMonitoring)
      ? (ingestion.deepMonitoring as Record<string, unknown>)
      : null;
  const startRaw = dm && typeof dm.startedAt === "string" ? dm.startedAt : null;
  const start = startRaw ? new Date(startRaw) : closedAt;
  const elapsedMs = Math.max(0, closedAt.getTime() - start.getTime());
  const elapsedHours = Math.min(24, elapsedMs / 3_600_000);
  const scoutPollingCyclesAddedAtClose = Math.max(0, Math.floor(elapsedHours * SCOUT_POLLS_PER_HOUR));

  const lt = bumpSentinelLaborTracker(ingestion.laborTracker, "Ironscout", scoutPollingCyclesAddedAtClose);

  const parsed = parseLaborTracker(lt);
  const weightedCycleUnits = Object.entries(parsed.byAgent).reduce(
    (s, [agent, r]) => s + r * depthFactorForAgent(agent),
    0,
  );
  const mheHumanHours = Math.round((weightedCycleUnits / MHE_CYCLES_PER_HUMAN_HOUR) * 100) / 100;

  return {
    ...parsed,
    finalizedAt: closedAt.toISOString(),
    totalReasoningCyclesAtClose: parsed.totalReasoningCycles,
    weightedCycleUnits: Math.round(weightedCycleUnits * 1000) / 1000,
    mheHumanHours,
    scoutPollingCyclesAddedAtClose,
  } as Prisma.JsonObject;
}
