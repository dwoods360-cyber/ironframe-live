import { useAgentStore } from "@/app/store/agentStore";

/**
 * When KIMBOT starts, wake Blue Team: set Ironsight and Coreintel to ACTIVE_DEFENSE
 * so StrategicIntel shows a pulsing green indicator.
 */
export function wakeBlueTeam(): void {
  const setAgentStatus = useAgentStore.getState().setAgentStatus;
  setAgentStatus("ironsight", "ACTIVE_DEFENSE");
  setAgentStatus("coreintel", "ACTIVE_DEFENSE");
  setAgentStatus("agentManager", "ACTIVE_DEFENSE");
}

/**
 * When KIMBOT stops, return agents to HEALTHY.
 */
export function sleepBlueTeam(): void {
  const setAgentStatus = useAgentStore.getState().setAgentStatus;
  setAgentStatus("ironsight", "HEALTHY");
  setAgentStatus("coreintel", "HEALTHY");
  setAgentStatus("agentManager", "HEALTHY");
}
