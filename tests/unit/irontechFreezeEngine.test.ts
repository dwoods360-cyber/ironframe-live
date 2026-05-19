import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    systemConfig: {
      findUnique: vi.fn().mockResolvedValue({
        sustainabilityLiveApiDegraded: false,
        sustainabilityApiDegradedSince: null,
        sustainabilityStaleLockdownWaived: false,
        stateFreezeActive: false,
      }),
    },
  },
}));

vi.mock("@/app/lib/riskRegistryDb", () => ({
  findRiskRegistryByThreatEventId: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/src/services/orchestration/checkpointer", () => ({
  getSovereignCheckpointChannelValues: vi.fn().mockResolvedValue({ tenant_id: "t1", status: "PROCESSING" }),
  getTenantBoundCheckpointTuple: vi.fn().mockResolvedValue({
    checkpoint: { id: "ckpt-1", channel_values: { tenant_id: "t1" } },
  }),
  executeAutonomousStateFreeze: vi.fn().mockResolvedValue({
    status: "OPERATIONAL_FREEZE_LOCKED",
    checkpointId: "ckpt-1",
    timestamp: new Date().toISOString(),
    tenantId: "t1",
    threadId: "thread-1",
  }),
}));

describe("Irontech freezeEngine (Postgres + risk_registry)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executeSystemHalt uses postgres checkpointer and registry readers", async () => {
    const { executeSystemHalt, loadPersistedHaltState } = await import(
      "@/src/services/irontech/freezeEngine"
    );
    const { executeAutonomousStateFreeze, getSovereignCheckpointChannelValues } = await import(
      "@/src/services/orchestration/checkpointer"
    );
    const { findRiskRegistryByThreatEventId } = await import("@/app/lib/riskRegistryDb");

    const halt = await executeSystemHalt({ tenantId: "t1", threadId: "thread-1" });
    expect(halt.operationalFreeze?.status).toBe("OPERATIONAL_FREEZE_LOCKED");
    expect(executeAutonomousStateFreeze).toHaveBeenCalledWith("thread-1", "t1");
    expect(getSovereignCheckpointChannelValues).toHaveBeenCalled();
    expect(findRiskRegistryByThreatEventId).toHaveBeenCalledWith("thread-1", "t1");

    const loaded = await loadPersistedHaltState({ tenantId: "t1", threadId: "thread-1" });
    expect(loaded.langGraphCheckpointId).toBe("ckpt-1");
    expect(loaded.langGraphChannelValues?.tenant_id).toBe("t1");
  });
});
