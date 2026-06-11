import { describe, expect, it, beforeEach } from "vitest";
import { useAgentRiskStore } from "@/app/store/agentRiskStore";

describe("agentRiskStore.flushBurdenedExecutionBuffers", () => {
  beforeEach(() => {
    useAgentRiskStore.setState({
      byIndex: {
        11: { healthScore: 42, riskLevel: "high" },
        8: { healthScore: 55, riskLevel: "medium" },
      },
      anomalyAcknowledgedIndices: new Set([11]),
      ironlockGlobalStateFreeze: false,
      quarantineHardBanActive: false,
      lastUpdatedAt: null,
    });
  });

  it("clears Agent 11 Ironintel BURDENED risk overlay on simulation nav flush", () => {
    useAgentRiskStore.getState().flushBurdenedExecutionBuffers();
    const snap = useAgentRiskStore.getState();
    expect(snap.byIndex[11]?.riskLevel).toBe("low");
    expect(snap.byIndex[8]?.riskLevel).toBe("low");
    expect(snap.anomalyAcknowledgedIndices.has(11)).toBe(false);
  });
});
