import { describe, expect, it } from "vitest";

import { looksLikeOsintTitleNoise } from "@/app/lib/server/ironleadsBuyingCommitteeExtract";

describe("suspect operator enrichment guards", () => {
  it("flags scrape-noise buyer labels", () => {
    expect(looksLikeOsintTitleNoise("PRIVACY COMPLIANCE SECURE APPLICATIONS")).toBe(true);
    expect(looksLikeOsintTitleNoise("Jordan Lee")).toBe(false);
  });
});
