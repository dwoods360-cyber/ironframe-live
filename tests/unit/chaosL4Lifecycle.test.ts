import { describe, expect, it } from "vitest";
import {
  buildChaosScenario4InitialIngestion,
  isChaosL4AwaitingJitGrant,
  isChaosL4HandoffActive,
  isChaosL4ReadyForTechClaim,
  parseChaosL4LifecycleFromIngestion,
} from "@/app/utils/chaosL4Lifecycle";

describe("chaosL4Lifecycle", () => {
  it("builds pre-computed Scenario 4 state at AWAITING_JIT_GRANT", () => {
    const ingestion = buildChaosScenario4InitialIngestion("tenant-uuid-1", 101n);
    expect(ingestion.lifecycleStep).toBe("AWAITING_JIT_GRANT");
    expect(ingestion.assignedRole).toBe("CUSTOMER_ANALYST");
    expect(ingestion.remoteSupportJitAwaitingGrant).toBe(true);
    const live = ingestion.irontechLive as { attempts: unknown[] };
    expect(live.attempts).toHaveLength(3);
  });

  it("detects JIT gate from lifecycle step", () => {
    const ingestion = JSON.stringify(
      buildChaosScenario4InitialIngestion("tenant-uuid-1", 101n),
    );
    expect(isChaosL4AwaitingJitGrant("MITIGATED", ingestion)).toBe(true);
    expect(isChaosL4HandoffActive(ingestion)).toBe(true);
  });

  it("detects tech claim readiness after JIT grant", () => {
    const base = buildChaosScenario4InitialIngestion("tenant-uuid-1", 101n);
    const ingestion = JSON.stringify({
      ...base,
      lifecycleStep: "JIT_GRANTED",
      assignedRole: "IRONFRAME_TECH_SUPPORT",
      remoteSupportJitAwaitingGrant: false,
    });
    expect(parseChaosL4LifecycleFromIngestion(ingestion)?.lifecycleStep).toBe("JIT_GRANTED");
    expect(isChaosL4ReadyForTechClaim(ingestion)).toBe(true);
    expect(isChaosL4AwaitingJitGrant("MITIGATED", ingestion)).toBe(false);
  });
});
