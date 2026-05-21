import {
  ATTBOT_ALERT_AGENT_NAMES,
  combineThreatPlanes as combineThreatPlanesForWorkforce,
  getWorkforceInventoryDrillActiveAgents,
} from "@/app/utils/workforceAgentState";

export {
  combineThreatPlanesForWorkforce,
  getWorkforceInventoryDrillActiveAgents,
  ATTBOT_ALERT_AGENT_NAMES,
};
/** CustomEvent name — Integrity Hub tiles listen for short interaction pulses (CLAIM / SUBMIT). */
export const WORKFORCE_SIMULATION_PROCESSING_EVENT = "ironframe:simulation-workforce-processing" as const;

export type WorkforceSimulationProcessingDetail = {
  agents: string[];
  ttlMs?: number;
};

/**
 * Agents pulsed on dual-key CLAIM/SUBMIT — aligned with ATTBOT defensive front (`ATTBOT_ALERT_AGENT_NAMES`).
 */
export function workforceAgentsForDualKeyBot(bot: "ATTBOT" | "KIMBOT" | "GRCBOT"): string[] {
  switch (bot) {
    case "ATTBOT":
      return [...ATTBOT_ALERT_AGENT_NAMES];
    case "KIMBOT":
      return ["Irontrust", "Ironwatch"];
    case "GRCBOT":
      return ["Irontally", "Ironscribe"];
    default:
      return [];
  }
}

export function dispatchWorkforceSimulationProcessing(
  agents: string[],
  ttlMs: number = 2600,
): void {
  if (typeof window === "undefined" || agents.length === 0) return;
  const detail: WorkforceSimulationProcessingDetail = { agents, ttlMs };
  window.dispatchEvent(new CustomEvent(WORKFORCE_SIMULATION_PROCESSING_EVENT, { detail }));
}
