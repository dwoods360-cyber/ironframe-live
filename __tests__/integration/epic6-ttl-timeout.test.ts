import { describe, it, expect } from "vitest";
import { IronscoutMonitor, EPIC6_EXECUTION_TTL_MS } from "@/agents/ironscout";
import { IronlockAuthority } from "@/agents/ironlock";

describe("Epic 6: TTL Boundary Enforcement", () => {
  it("Quarantines risk execution when TTL exceeds 71.75 hours without math corruption", async () => {
    const riskId = "risk_timeout_002";
    const tenantId = "tenant_vaultbank_5M";
    const initialAle = 590_000_000n;

    expect(EPIC6_EXECUTION_TTL_MS).toBe(258_300_000);

    const executionDurationMs = 258_300_001;

    const isBreached = IronscoutMonitor.checkTTL(executionDurationMs);
    expect(isBreached).toBe(true);

    const quarantineState = await IronlockAuthority.quarantineProcess(riskId, tenantId, {
      ale_impact: initialAle,
    });

    expect(quarantineState.status).toBe("QUARANTINED");
    expect(quarantineState.interrupt_reason).toBe("TTL_EXCEEDED");

    expect(typeof quarantineState.ale_impact).toBe("bigint");
    expect(quarantineState.ale_impact).toBe(590_000_000n);
  });
});
