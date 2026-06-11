import { describe, expect, it } from "vitest";
import {
  buildShowcaseAgentTelemetry,
  computeShowcaseAgentStatus,
  estimateAgentEventsPerSec,
  isShowcaseTelemetryTenantBound,
  SHOWCASE_WORKFORCE_AGENTS,
} from "@/app/utils/workforceShowcaseTelemetry";

describe("workforceShowcaseTelemetry", () => {
  it("maps canonical spotlight agents 01, 08, 11", () => {
    expect(SHOWCASE_WORKFORCE_AGENTS.map((a) => a.index)).toEqual([1, 8, 11]);
    expect(SHOWCASE_WORKFORCE_AGENTS.map((a) => a.name)).toEqual([
      "Ironcore",
      "Ironsight",
      "Ironintel",
    ]);
  });

  it("blocks cross-tenant telemetry when scope mismatches", () => {
    expect(isShowcaseTelemetryTenantBound("tenant-a", "tenant-a")).toBe(true);
    expect(isShowcaseTelemetryTenantBound("tenant-a", "tenant-b")).toBe(false);
    expect(isShowcaseTelemetryTenantBound(null, "tenant-a")).toBe(false);
  });

  it("elevates to HIGH THROUGHPUT on simulation spike", () => {
    const status = computeShowcaseAgentStatus({
      agentName: "Ironsight",
      pulse: "ALERT",
      riskLevel: "low",
      systemLatencyMs: 120,
      eventsPerSec: 0.1,
      simulationSpike: true,
      telemetryActive: false,
    });
    expect(status).toBe("HIGH THROUGHPUT");
  });

  it("marks Ironcore BURDENED on queue lag", () => {
    const status = computeShowcaseAgentStatus({
      agentName: "Ironcore",
      pulse: "IDLE",
      riskLevel: "low",
      systemLatencyMs: 500,
      eventsPerSec: 0,
      simulationSpike: false,
      telemetryActive: false,
    });
    expect(status).toBe("BURDENED");
  });

  it("estimates events/sec from intelligence stream hits", () => {
    const eps = estimateAgentEventsPerSec(
      [
        "> [IRONSIGHT] CVE-2026-0001 blast radius cataloged",
        "> [SYSTEM] idle",
        "> [IRONSIGHT] sweep complete",
      ],
      "Ironsight",
      false,
    );
    expect(eps).toBeGreaterThan(0);
  });

  it("zeros stream metrics when tenant is not bound", () => {
    const rows = buildShowcaseAgentTelemetry({
      activeTenantUuid: "tenant-a",
      telemetryTenantScope: "tenant-b",
      activeThreats: [],
      pipelineThreats: [],
      intelligenceStream: ["> [IRONSIGHT] CVE hit"],
      agentTelemetryPulseUntil: { Ironsight: Date.now() + 5000 },
      agentRiskByIndex: { 8: { healthScore: 40, riskLevel: "medium" } },
      systemLatencyMs: 900,
      isKimbotActive: true,
      isGrcbotActive: true,
      grcBotCompanyCount: 100,
    });
    expect(rows.every((r) => r.eventsPerSec === 0)).toBe(true);
    expect(rows.every((r) => r.tenantBound === false)).toBe(true);
    expect(rows.every((r) => r.status === "HEALTHY")).toBe(true);
  });
});
