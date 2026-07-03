import { describe, expect, it } from "vitest";

import {
  exportQuotaForTier,
  isFeatureEntitledForTier,
  resolvePlanTierForSlug,
} from "@/app/lib/auth/tenantFeatureEntitlement";

describe("tenantFeatureEntitlement", () => {
  it("maps seed tenant slugs to plan tiers", () => {
    expect(resolvePlanTierForSlug("vaultbank")).toBe("VAULT");
    expect(resolvePlanTierForSlug("gridcore")).toBe("SUSTAINABILITY");
    expect(resolvePlanTierForSlug("medshield")).toBe("BASELINE");
    expect(resolvePlanTierForSlug("unknown-co")).toBe("BASELINE");
  });

  it("enforces feature matrix by tier", () => {
    expect(isFeatureEntitledForTier("BASELINE", "IRONQUERY_EXPORT")).toBe(true);
    expect(isFeatureEntitledForTier("BASELINE", "EVIDENCE_LOCKER_WORM")).toBe(false);
    expect(isFeatureEntitledForTier("VAULT", "EVIDENCE_LOCKER_WORM")).toBe(true);
    expect(isFeatureEntitledForTier("SUSTAINABILITY", "CARBON_PULSE")).toBe(true);
  });

  it("defines export quotas per tier", () => {
    expect(exportQuotaForTier("BASELINE")).toBeLessThan(exportQuotaForTier("VAULT"));
  });
});
