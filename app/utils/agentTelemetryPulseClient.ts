import { useAgentStore } from "@/app/store/agentStore";
import {
  AGENT_TELEMETRY_PULSE_MS,
  parseWorkforceAgentsFromTelemetryText,
} from "@/app/utils/workforceTelemetryPulse";

export { AGENT_TELEMETRY_PULSE_MS };

/** Client-only: flash workforce agent indicators from audit / terminal telemetry text. */
export function signalAgentTelemetryFromText(text: string, threadId?: string): void {
  if (typeof window === "undefined") return;
  const agents = parseWorkforceAgentsFromTelemetryText(text);
  if (agents.length === 0) return;
  useAgentStore.getState().pulseAgentsFromTelemetry(agents, threadId);
}
