import { useAgentStore } from "@/app/store/agentStore";

/**
 * When Kimbot sim starts, wake Blue Team: set Ironsight, Coreintel (Ironintel), Agent Manager to ACTIVE_DEFENSE.
 */
export function wakeBlueTeam(): void {
  const setAgentStatus = useAgentStore.getState().setAgentStatus;
  setAgentStatus("ironsight", "ACTIVE_DEFENSE");
  setAgentStatus("coreintel", "ACTIVE_DEFENSE");
  setAgentStatus("agentManager", "ACTIVE_DEFENSE");
}

/** When Kimbot sim stops, return agents to HEALTHY. */
export function sleepBlueTeam(): void {
  const setAgentStatus = useAgentStore.getState().setAgentStatus;
  setAgentStatus("ironsight", "HEALTHY");
  setAgentStatus("coreintel", "HEALTHY");
  setAgentStatus("agentManager", "HEALTHY");
}
