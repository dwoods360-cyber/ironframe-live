import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { parseWorkforceAgentsFromTelemetryText } from "@/app/utils/workforceTelemetryPulse";
import { useAgentStore } from "@/app/store/agentStore";

describe("workforceTelemetryPulse", () => {
  it("parses Irongate and Ironlock from DMZ forensic lines", () => {
    const agents = parseWorkforceAgentsFromTelemetryText(
      "[Irongate] [AGENT-14] SECURITY_THREAT_INTERCEPTED — IRONLOCK INTERRUPT containment",
    );
    expect(agents).toContain("Irongate");
    expect(agents).toContain("Ironlock");
  });

  it("parses Irontech from IRONCHAOS telemetry", () => {
    const agents = parseWorkforceAgentsFromTelemetryText("IRONCHAOS drill telemetry for tenant");
    expect(agents).toContain("Irontech");
  });
});

describe("useAgentStore telemetry pulse", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useAgentStore.setState({ agentTelemetryPulseUntil: {} });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets and clears agentTelemetryPulseUntil after 2.5s", () => {
    useAgentStore.getState().pulseAgentsFromTelemetry(["Irongate"]);
    expect(useAgentStore.getState().agentTelemetryPulseUntil.Irongate).toBeGreaterThan(Date.now());

    vi.advanceTimersByTime(2500);
    expect(useAgentStore.getState().agentTelemetryPulseUntil.Irongate).toBeUndefined();
  });
});
