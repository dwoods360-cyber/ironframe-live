import { describe, expect, it } from "vitest";

import { isApolloConfigured } from "@/app/lib/server/apolloEnrichmentClient";

describe("apolloEnrichmentClient", () => {
  it("reports configured only when APOLLO_API_KEY is set", () => {
    const prior = process.env.APOLLO_API_KEY;
    try {
      delete process.env.APOLLO_API_KEY;
      expect(isApolloConfigured()).toBe(false);
      process.env.APOLLO_API_KEY = "test-key";
      expect(isApolloConfigured()).toBe(true);
    } finally {
      if (prior === undefined) delete process.env.APOLLO_API_KEY;
      else process.env.APOLLO_API_KEY = prior;
    }
  });
});
