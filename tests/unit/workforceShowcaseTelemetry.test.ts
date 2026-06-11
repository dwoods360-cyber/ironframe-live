import { describe, expect, it } from "vitest";
import {
  buildShowcaseAgentTelemetry,
  computeShowcaseAgentStatus,
  estimateAgentEventsPerSec,
  IRONCORE_QUEUE_LAG_MS_BURDENED,
  isShowcaseAgentStuckProcessing,
  mapHealthScoreToShowcaseRiskLevel,
  isShowcaseTelemetryTenantBound,
  resolveShowcaseExecutionStrain,
  SHOWCASE_HEALTH_SCORE_BURDENED_BELOW,
  SHOWCASE_STUCK_PROCESSING_MS,
  SHOWCASE_WORKFORCE_AGENTS,
} from "@/app/utils/workforceShowcaseTelemetry";

const baseBuildInput = {
  activeTenantUuid: "tenant-a",
  telemetryTenantScope: "tenant-a",
  activeThreats: [] as import("@/app/store/riskStore").PipelineThreat[],
  pipelineThreats: [] as import("@/app/store/riskStore").PipelineThreat[],
  intelligenceStream: [] as string[],
  agentTelemetryPulseUntil: {} as Record<string, number>,
  agentRiskByIndex: {} as Record<number, { healthScore: number; riskLevel: "low" | "medium" | "high" }>,
  executionStrainByIndex: {} as Record<number, boolean>,
  agentProcessingSince: {} as Partial<Record<"ironsight" | "coreintel" | "agentManager", number>>,
  instrumentedAgentStatus: {
    ironsight: { status: "HEALTHY" as const },
    coreintel: { status: "HEALTHY" as const },
    agentManager: { status: "HEALTHY" as const },
  },
  systemLatencyMs: null as number | null,
  isKimbotActive: false,
  isGrcbotActive: false,
  grcBotCompanyCount: 0,
};

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
      healthScore: 85,
      systemLatencyMs: 120,
      eventsPerSec: 0.1,
      simulationSpike: true,
      telemetryActive: false,
      executionStrain: false,
    });
    expect(status).toBe("HIGH THROUGHPUT");
  });

  it("ignores medium Ironwatch risk for BURDENED (score >= 30)", () => {
    const status = computeShowcaseAgentStatus({
      agentName: "Ironintel",
      pulse: "IDLE",
      healthScore: 55,
      systemLatencyMs: 120,
      eventsPerSec: 0,
      simulationSpike: false,
      telemetryActive: false,
      executionStrain: false,
    });
    expect(status).toBe("HEALTHY");
  });

  it("marks BURDENED when Ironwatch health score falls below 30", () => {
    const status = computeShowcaseAgentStatus({
      agentName: "Ironintel",
      pulse: "IDLE",
      healthScore: SHOWCASE_HEALTH_SCORE_BURDENED_BELOW - 1,
      systemLatencyMs: 120,
      eventsPerSec: 0,
      simulationSpike: false,
      telemetryActive: false,
      executionStrain: false,
    });
    expect(status).toBe("BURDENED");
  });

  it("marks Ironcore BURDENED only above 800ms queue lag", () => {
    expect(
      computeShowcaseAgentStatus({
        agentName: "Ironcore",
        pulse: "IDLE",
        healthScore: 90,
        systemLatencyMs: 500,
        eventsPerSec: 0,
        simulationSpike: false,
        telemetryActive: false,
        executionStrain: false,
      }),
    ).toBe("HEALTHY");

    expect(
      computeShowcaseAgentStatus({
        agentName: "Ironcore",
        pulse: "IDLE",
        healthScore: 90,
        systemLatencyMs: IRONCORE_QUEUE_LAG_MS_BURDENED + 50,
        eventsPerSec: 0,
        simulationSpike: false,
        telemetryActive: false,
        executionStrain: false,
      }),
    ).toBe("BURDENED");
  });

  it("execution strain overrides quiet health thresholds", () => {
    const status = computeShowcaseAgentStatus({
      agentName: "Ironsight",
      pulse: "IDLE",
      healthScore: 95,
      systemLatencyMs: 50,
      eventsPerSec: 0,
      simulationSpike: false,
      telemetryActive: false,
      executionStrain: true,
    });
    expect(status).toBe("BURDENED");
  });

  it("detects stuck PROCESSING for Ironsight", () => {
    const now = 20_000;
    const since = now - SHOWCASE_STUCK_PROCESSING_MS - 1;
    expect(
      isShowcaseAgentStuckProcessing({
        agentName: "Ironsight",
        agentStatus: "PROCESSING",
        agentProcessingSince: { ironsight: since },
        nowMs: now,
      }),
    ).toBe(true);
    expect(
      resolveShowcaseExecutionStrain({
        agentIndex: 8,
        agentName: "Ironsight",
        agentStatus: "PROCESSING",
        executionStrainByIndex: {},
        agentProcessingSince: { ironsight: since },
        nowMs: now,
      }),
    ).toBe(true);
  });

  it("estimates events/sec from intelligence stream hits", () => {
    const eps = estimateAgentEventsPerSec(
      [
        "> [IRONSIGHT] CVE-2026-0001 blast radius cataloged",
        "> [SYSTEM] idle",
        "> [IRONSIGHT] sweep complete",
      ],
      "Ironsight",
    );
    expect(eps).toBeGreaterThan(0);
  });

  it("does not inflate events/sec when telemetry pulse is active without stream hits", () => {
    expect(estimateAgentEventsPerSec([], "Ironsight")).toBe(0);
  });

  it("does not mark HIGH THROUGHPUT from telemetry pulse alone", () => {
    const status = computeShowcaseAgentStatus({
      agentName: "Ironsight",
      pulse: "TELEMETRY",
      healthScore: 85,
      systemLatencyMs: 120,
      eventsPerSec: 0,
      simulationSpike: false,
      telemetryActive: true,
      executionStrain: false,
    });
    expect(status).toBe("HEALTHY");
  });

  it("maps medium Ironwatch scores to low showcase risk for tooltips", () => {
    expect(mapHealthScoreToShowcaseRiskLevel(55)).toBe("low");
    expect(mapHealthScoreToShowcaseRiskLevel(25)).toBe("high");
  });

  it("zeros stream metrics when tenant is not bound", () => {
    const rows = buildShowcaseAgentTelemetry({
      ...baseBuildInput,
      activeTenantUuid: "tenant-a",
      telemetryTenantScope: "tenant-b",
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
