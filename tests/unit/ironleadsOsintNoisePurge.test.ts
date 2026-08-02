import { describe, expect, it } from "vitest";

import { looksLikeOsintTitleNoise } from "@/app/lib/server/ironleadsBuyingCommitteeExtract";

describe("OSINT title-noise discard policy", () => {
  it("treats BOD 26-04 harvest titles as discardable noise", () => {
    expect(looksLikeOsintTitleNoise("BOD 26-04 Prioritizing Security")).toBe(true);
    expect(looksLikeOsintTitleNoise("BOD 26-04: Prioritizing Security Updates Based on Risk")).toBe(
      true,
    );
  });

  it("does not discard real beachhead company names", () => {
    expect(looksLikeOsintTitleNoise("Western Alliance Bancorporation")).toBe(false);
    expect(looksLikeOsintTitleNoise("Pivot Point Security")).toBe(false);
    expect(looksLikeOsintTitleNoise("Ruleset GRC Advisory")).toBe(false);
  });
});
