"use client";

import type { CoreWorkforceAgent } from "@/app/config/agents";
import { useIroncastNotificationStore } from "@/app/store/ironcastNotificationStore";
import { useGrcAgentMetaDrawerStore } from "@/app/store/grcAgentMetaDrawerStore";
import type { AgentPulseState } from "@/app/utils/workforceAgentState";

export function pushAgentTelemetryIsolationToast(agent: CoreWorkforceAgent, pulse: AgentPulseState) {
  const operationalHealth =
    pulse === "ALERT" ? "ALERT" : pulse === "IDLE" ? "STANDBY" : "ACTIVE";
  useIroncastNotificationStore.getState().pushToast({
    threatDetected: `[${agent.name.toUpperCase()}] LIVE TELEMETRY STATE`,
    agentAction: `Roster Index: ${agent.index} | Operational Health: ${operationalHealth} | Bus Stream: Verified Connection`,
    severity: pulse === "ALERT" ? "critical" : "warning",
  });
}

export function openAgentMetaSpecification(agent: CoreWorkforceAgent) {
  useGrcAgentMetaDrawerStore.getState().openAgent(agent);
}

export function navigateToAgentDiagnostics(agent: CoreWorkforceAgent) {
  if (typeof window === "undefined") return;
  window.location.assign(`/opsupport#agent-${agent.index}`);
}
