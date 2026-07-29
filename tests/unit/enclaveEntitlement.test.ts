import { describe, expect, it } from "vitest";

import {
  COMMERCIAL_TIER,
  PATH_B_INCLUDED_SUBTENANT_ENCLAVES,
  SUBTENANT_ENCLAVE_CAP_BY_TIER,
} from "@/lib/ironframeProductKnowledge/commercial";
import {
  evaluateSubtenantCap,
  parseCommercialTier,
  parseEnclaveRole,
  resolveMaxSubtenantSlots,
} from "@/app/lib/server/enclaveEntitlement";

describe("enclaveEntitlement", () => {
  it("defaults unknown tiers to PATH_B", () => {
    expect(parseCommercialTier(undefined)).toBe(COMMERCIAL_TIER.PATH_B);
    expect(parseCommercialTier("nope")).toBe(COMMERCIAL_TIER.PATH_B);
    expect(parseCommercialTier("command_core")).toBe(COMMERCIAL_TIER.COMMAND_CORE);
  });

  it("parses enclave roles", () => {
    expect(parseEnclaveRole("SUBTENANT")).toBe("SUBTENANT");
    expect(parseEnclaveRole("primary")).toBe("PRIMARY");
    expect(parseEnclaveRole(null)).toBe("PRIMARY");
  });

  it("resolves Path B hard-cap of 2 Subtenant Enclaves", () => {
    expect(
      resolveMaxSubtenantSlots({ commercialTier: COMMERCIAL_TIER.PATH_B }),
    ).toBe(PATH_B_INCLUDED_SUBTENANT_ENCLAVES);
    expect(SUBTENANT_ENCLAVE_CAP_BY_TIER.PATH_B).toBe(2);
  });

  it("honors entitledSubtenantSlots override for change orders", () => {
    expect(
      resolveMaxSubtenantSlots({
        commercialTier: COMMERCIAL_TIER.PATH_B,
        entitledSubtenantSlots: 5,
      }),
    ).toBe(5);
  });

  it("blocks when active Subtenants meet the Path B cap", () => {
    const blocked = evaluateSubtenantCap({ activeSubtenants: 2, maxSubtenants: 2 });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) throw new Error("expected block");
    expect(blocked.error).toMatch(/Subtenant Enclave cap reached/);
    expect(blocked.error).toMatch(/Change Order/);

    const open = evaluateSubtenantCap({ activeSubtenants: 1, maxSubtenants: 2 });
    expect(open.ok).toBe(true);
    if (!open.ok) throw new Error("expected open");
    expect(open.remainingSlots).toBe(1);
  });
});
