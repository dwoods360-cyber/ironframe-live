import { describe, expect, it } from "vitest";
import {
  clearChaosConstitutionalVoid,
  isChaosConstitutionalVoidActive,
  setChaosConstitutionalVoid,
} from "@/app/lib/chaosConstitutionalVoid";
import { DEAD_MAN_SWITCH_SIMULATION_TTL_MS, resolveDeadManSwitchTtlMs } from "@/app/lib/deadMansSwitch";

describe("chaosConstitutionalVoid", () => {
  const tenantId = "5c420f5a-0000-4000-8000-000000000001";

  it("arms and clears per-tenant void", async () => {
    clearChaosConstitutionalVoid(tenantId);
    expect(isChaosConstitutionalVoidActive(tenantId)).toBe(false);
    await setChaosConstitutionalVoid(tenantId);
    expect(isChaosConstitutionalVoidActive(tenantId)).toBe(true);
    clearChaosConstitutionalVoid(tenantId);
    expect(isChaosConstitutionalVoidActive(tenantId)).toBe(false);
  });
});

describe("resolveDeadManSwitchTtlMs", () => {
  it("uses 240s for simulation DMS", () => {
    expect(resolveDeadManSwitchTtlMs({ isSimulation: true })).toBe(
      DEAD_MAN_SWITCH_SIMULATION_TTL_MS,
    );
    expect(DEAD_MAN_SWITCH_SIMULATION_TTL_MS).toBe(240_000);
  });
});
