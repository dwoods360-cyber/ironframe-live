import { describe, it, expect, beforeEach } from "vitest";
import { IronguardEnforcer } from "@/agents/ironguard";
import { db, resetLangGraphCheckpointStore } from "@/infrastructure/db";

describe("Epic 6: DB Transaction Isolation", () => {
  beforeEach(() => {
    resetLangGraphCheckpointStore();
  });

  it("Handles concurrent checkpoint writes using strict serialization", async () => {
    const riskId = "risk_race_003";
    const tenantId = "tenant_gridcore_4M";

    await db.langGraphCheckpoints.create({
      data: { id: riskId, tenant_id: tenantId, version: 1, status: "PROCESSING" },
    });

    const agent1Update = IronguardEnforcer.safeUpdateCheckpoint(riskId, tenantId, {
      version: 1,
      payload: { agent: "Ironscribe", complete: true },
    });

    const agent2Update = IronguardEnforcer.safeUpdateCheckpoint(riskId, tenantId, {
      version: 1,
      payload: { agent: "Irontrust", complete: true },
    });

    const results = await Promise.allSettled([agent1Update, agent2Update]);

    const successes = results.filter((r) => r.status === "fulfilled");
    const failures = results.filter((r) => r.status === "rejected");

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);

    if (failures[0].status === "rejected") {
      expect((failures[0].reason as Error).message).toContain("TAS_VIOLATION: Concurrent state mutation detected");
    }
  });
});
