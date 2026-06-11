import { describe, expect, it } from "vitest";
import {
  computeSimulatedAleReallocationCents,
  formatHitlApprovalNote,
  hitlCategoryRequiresCisoAdmin,
  parseHitlCategoryFromApprovalNote,
  readOnlyTenantBaselineAleCents,
} from "@/app/utils/hitlReviewQueue";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";

describe("hitlReviewQueue", () => {
  it("uses BigInt integer cents for ALE reallocation without float drift", () => {
    const baseline = readOnlyTenantBaselineAleCents(TENANT_UUIDS.medshield);
    expect(baseline).toBe(1_110_000_000n);
    const realloc = computeSimulatedAleReallocationCents(TENANT_UUIDS.medshield);
    expect(realloc).toBe(27_750_000n);
    expect(typeof realloc).toBe("bigint");
  });

  it("parses HITL category tags from approval notes", () => {
    const note = formatHitlApprovalNote("BREACH_ATTESTATION", "CISO manifest pending.");
    expect(parseHitlCategoryFromApprovalNote(note)).toBe("BREACH_ATTESTATION");
    expect(hitlCategoryRequiresCisoAdmin("BREACH_ATTESTATION")).toBe(true);
    expect(hitlCategoryRequiresCisoAdmin("CONFIG_AUDIT_TRAIL")).toBe(false);
  });
});
