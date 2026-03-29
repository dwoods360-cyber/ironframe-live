import type { AgentKey, AgentStatus } from "@/app/store/agentStore";

/** Constitutional roster size (19-agent workforce). */
export const FLEET_AGENT_COUNT = 19;

/** Instrumented agents in `agentStore` (live status). */
export const INSTRUMENTED_AGENT_KEYS: AgentKey[] = ["ironsight", "coreintel", "agentManager"];

const STATUS_EFFICIENCY: Record<AgentStatus, number> = {
  HEALTHY: 100,
  PROCESSING: 96,
  ACTIVE_DEFENSE: 93,
  WARNING: 84,
  OFFLINE: 68,
};

/** Non-UI agents assumed at nominal steady-state until individually instrumented. */
const NOMINAL_AGENT_EFFICIENCY = 98;

/**
 * Average fleet efficiency %: weighted blend of live `agentStore` statuses
 * and nominal fill for the remaining agents up to {@link FLEET_AGENT_COUNT}.
 */
export function computeAverageFleetEfficiencyPct(
  agents: Record<AgentKey, { status: AgentStatus }>,
  systemLatencyMs: number | null,
): number {
  let sum = 0;
  for (const key of INSTRUMENTED_AGENT_KEYS) {
    const row = agents[key];
    if (!row) continue;
    sum += STATUS_EFFICIENCY[row.status] ?? 90;
  }
  const remaining = Math.max(0, FLEET_AGENT_COUNT - INSTRUMENTED_AGENT_KEYS.length);
  sum += NOMINAL_AGENT_EFFICIENCY * remaining;

  let pct = sum / FLEET_AGENT_COUNT;

  if (systemLatencyMs != null && systemLatencyMs > 350) {
    const penalty = Math.min(3.5, (systemLatencyMs - 350) / 1800);
    pct = Math.max(62, pct - penalty);
  }

  return Math.round(pct * 10) / 10;
}
