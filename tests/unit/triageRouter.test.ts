import { describe, it, expect, vi, beforeEach } from "vitest";
import { TAS_HEALTH_TRIAGE_THRESHOLD_PERCENT } from "@/app/config/tasHealthTriage";

vi.mock("@/src/services/orchestration/checkpointer", () => ({
  executeAutonomousStateFreeze: vi.fn().mockResolvedValue({
    status: "OPERATIONAL_FREEZE_LOCKED",
    checkpointId: "cp-test",
    timestamp: new Date().toISOString(),
    tenantId: "tenant-1",
    threadId: "thread-1",
  }),
}));

vi.mock("@/app/lib/riskRegistryDb", () => ({
  findRiskRegistryByThreatEventId: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    systemConfig: {
      update: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue({
        sustainabilityLiveApiDegraded: false,
        sustainabilityApiDegradedSince: null,
        sustainabilityStaleLockdownWaived: false,
        stateFreezeActive: false,
      }),
    },
    riskRegistry: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
  },
}));

vi.mock("@/app/actions/auditActions", () => ({
  logThreatActivity: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("evaluateSystemTriage (TAS §4.3 consolidated engine)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns OPERATIONAL_BASELINE at or above 50% threshold", async () => {
    const { evaluateSystemTriage } = await import("@/src/services/irontech/triageRouter");
    const result = await evaluateSystemTriage({
      tenantId: "t1",
      threadId: "th-1",
      healthBarPercent: TAS_HEALTH_TRIAGE_THRESHOLD_PERCENT,
      incidentZone: "TELEMETRY_DROP",
    });
    expect(result.status).toBe("OPERATIONAL_BASELINE");
    if (result.status === "OPERATIONAL_BASELINE") {
      expect(result.health).toBe(TAS_HEALTH_TRIAGE_THRESHOLD_PERCENT);
    }
  });

  it("runs Ironlock + Postgres freeze + repair below 50%", async () => {
    const { evaluateSystemTriage } = await import("@/src/services/irontech/triageRouter");
    const { executeAutonomousStateFreeze } = await import(
      "@/src/services/orchestration/checkpointer"
    );
    const result = await evaluateSystemTriage({
      tenantId: "t1",
      threadId: "th-2",
      healthBarPercent: 42,
      incidentZone: "RED_TEAM_BREACH",
    });
    expect(result.status).toBe("TRIAGED_AND_HEALED");
    expect(executeAutonomousStateFreeze).toHaveBeenCalledWith("th-2", "t1");
    if (result.status === "TRIAGED_AND_HEALED") {
      expect(result.checkpointId).toBe("cp-test");
      expect(result.incidentZone).toBe("RED_TEAM_BREACH");
      expect(result.repairLog).toContain("[REPAIR SUCCESS]");
      expect(result.ironlockInterruptArmed).toBe(true);
    }
  });
});
