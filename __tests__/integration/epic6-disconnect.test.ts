import { describe, it, expect, beforeEach } from "vitest";
import { IrontechHealer } from "@/agents/irontech";
import { IroncoreOrchestrator } from "@/agents/ironcore";
import { db, resetLangGraphCheckpointStore } from "@/infrastructure/db";

describe("Epic 6: Irontech State Freeze & Recovery", () => {
  beforeEach(() => {
    resetLangGraphCheckpointStore();
  });

  it("Freezes LangGraph state on stream disconnect and resumes accurately", async () => {
    const riskId = "risk_disconnect_001";
    const tenantId = "tenant_medshield_11M";

    const activeState = {
      status: "PROCESSING",
      step: "compliance_extraction",
      ale_impact: 1_110_000_000n,
    };

    await IrontechHealer.freezeState(riskId, tenantId, activeState);

    const checkpoint = await db.langGraphCheckpoints.findUnique({
      where: { id: riskId, tenant_id: tenantId },
    });
    expect(checkpoint).not.toBeNull();
    expect(checkpoint!.persisted_state).toBe("PROCESSING");

    const resumedState = await IroncoreOrchestrator.resumeFromCheckpoint(riskId, tenantId);

    expect(resumedState.step).toBe("compliance_extraction");
    expect(typeof resumedState.ale_impact).toBe("bigint");
    expect(resumedState.ale_impact).toBe(1_110_000_000n);
  });
});
