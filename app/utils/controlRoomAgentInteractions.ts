"use client";

import type { CoreWorkforceAgent } from "@/app/config/agents";
import { useIroncastNotificationStore } from "@/app/store/ironcastNotificationStore";
import type { AgentPulseState } from "@/app/utils/workforceAgentState";

/** Right-click — sticky Ironcast telemetry toast at viewport tier-1. */
export function pushAgentTelemetryIsolationToast(
  agent: CoreWorkforceAgent,
  pulse: AgentPulseState,
): void {
  const operationalHealth =
    pulse === "ALERT" ? "ALERT" : pulse === "IDLE" ? "STANDBY" : "ACTIVE";
  useIroncastNotificationStore.getState().pushToast({
    threatDetected: `[${agent.name.toUpperCase()}] LIVE TELEMETRY STATE`,
    agentAction: `Roster Index: ${agent.index} | Operational Health: ${operationalHealth} | Bus Stream: Verified Connection`,
    severity: pulse === "ALERT" ? "critical" : "warning",
  });
}

/** Double-click — deep diagnostics matrix on OpSupport. */
export function navigateToAgentDiagnostics(agent: CoreWorkforceAgent): void {
  if (typeof window === "undefined") return;
  window.location.assign(`/opsupport#agent-${agent.index}`);
}
