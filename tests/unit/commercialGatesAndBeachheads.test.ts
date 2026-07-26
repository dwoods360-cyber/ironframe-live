import { describe, expect, it } from "vitest";

import {
  beachheadSectorToBaselineTarget,
  inferBeachheadFromOrgText,
} from "@/lib/ironframeProductKnowledge/beachheads";
import {
  INBOUND_LEAD_REPLY_SLA_HOURS,
  isCounselPathBSendApproved,
  isPublicInstantCheckoutEnabled,
  resolveWorkflowReviewBookingUrl,
} from "@/config/commercialGates";

describe("beachhead inference for inbound", () => {
  it("detects MSSP / health / utility / bank keywords", () => {
    expect(inferBeachheadFromOrgText({ orgName: "Acme MSSP Partners" })).toBe("MSSP_ENCLAVE");
    expect(inferBeachheadFromOrgText({ orgName: "Regional Hospital HIPAA Ops" })).toBe(
      "HEALTH_HIPAA",
    );
    expect(inferBeachheadFromOrgText({ orgName: "Grid Utility NERC CIP" })).toBe("UTILITY_NERC");
    expect(inferBeachheadFromOrgText({ orgName: "First Regional Bank BHC" })).toBe("REGIONAL_BHC");
  });

  it("maps Core 4 to sales baseline targets", () => {
    expect(beachheadSectorToBaselineTarget("UTILITY_NERC")).toBe("publicPower");
    expect(beachheadSectorToBaselineTarget("HEALTH_HIPAA")).toBe("communityHealth");
    expect(beachheadSectorToBaselineTarget("MSSP_ENCLAVE")).toBe("regionalBHC");
  });
});

describe("commercialGates defaults", () => {
  it("keeps public instant checkout and counsel send off by default", () => {
    expect(isPublicInstantCheckoutEnabled()).toBe(false);
    expect(isCounselPathBSendApproved()).toBe(false);
    expect(resolveWorkflowReviewBookingUrl()).toBeNull();
    expect(INBOUND_LEAD_REPLY_SLA_HOURS).toBe(4);
  });
});
