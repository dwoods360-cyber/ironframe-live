import { describe, expect, it } from "vitest";

import { isProspeoConfigured } from "@/app/lib/server/prospeoEnrichmentClient";

describe("prospeoEnrichmentClient", () => {
  it("reports configured only when PROSPEO_API_KEY is set", () => {
    const prior = process.env.PROSPEO_API_KEY;
    try {
      delete process.env.PROSPEO_API_KEY;
      expect(isProspeoConfigured()).toBe(false);
      process.env.PROSPEO_API_KEY = "test-key";
      expect(isProspeoConfigured()).toBe(true);
    } finally {
      if (prior === undefined) delete process.env.PROSPEO_API_KEY;
      else process.env.PROSPEO_API_KEY = prior;
    }
  });
});
