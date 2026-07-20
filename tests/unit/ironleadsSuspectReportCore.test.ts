import { describe, expect, it } from "vitest";

import {
  buildSuspectHoldBlockers,
  looksLikeOsintTitleNoise,
} from "@/app/lib/server/ironleadsSuspectReportCore";

describe("ironleadsSuspectReportCore", () => {
  it("flags OSINT title noise company names", () => {
    expect(looksLikeOsintTitleNoise("BOD 26-04 Prioritizing Security")).toBe(true);
    expect(looksLikeOsintTitleNoise("U.S. Department of Health")).toBe(true);
    expect(looksLikeOsintTitleNoise("Western Alliance Bancorporation")).toBe(false);
  });

  it("explains why a demo-tenant SUSPECT is held out of PROSPECT", () => {
    const blockers = buildSuspectHoldBlockers({
      company: "Western Alliance Bancorporation",
      email: "suspect+94cff908@ironleads.local",
      phone: null,
      tenantSlug: "vaultbank",
      accountDomain: null,
      stage: "SUSPECT",
    });
    const codes = blockers.map((b) => b.code);
    expect(codes).toContain("STAGE_SUSPECT");
    expect(codes).toContain("PLACEHOLDER_EMAIL");
    expect(codes).toContain("NO_PHONE");
    expect(codes).toContain("NOT_PROSPECT_POOL");
    expect(codes).toContain("MISSING_DOMAIN");
    expect(codes).not.toContain("OSINT_TITLE_NOISE");
  });

  it("does not flag real email + phone on prospect-pool as contact blockers", () => {
    const blockers = buildSuspectHoldBlockers({
      company: "BlueRadius Cyber",
      email: "info@blueradius.io",
      phone: "+18009300989",
      tenantSlug: "prospect-pool",
      accountDomain: "blueradius.io",
      stage: "PROSPECT",
    });
    const codes = blockers.map((b) => b.code);
    expect(codes).not.toContain("PLACEHOLDER_EMAIL");
    expect(codes).not.toContain("NO_PHONE");
    expect(codes).not.toContain("NOT_PROSPECT_POOL");
    expect(codes).not.toContain("STAGE_SUSPECT");
  });
});
