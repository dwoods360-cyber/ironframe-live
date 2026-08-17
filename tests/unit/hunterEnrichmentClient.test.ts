import { describe, expect, it } from "vitest";

import {
  isHunterConfigured,
  isHunterEmailPromoteReady,
  linkedinHandleFromUrl,
} from "@/app/lib/server/hunterEnrichmentClient";

describe("hunterEnrichmentClient", () => {
  it("reports configured only when HUNTER_API_KEY is a real value", () => {
    const prior = process.env.HUNTER_API_KEY;
    try {
      delete process.env.HUNTER_API_KEY;
      expect(isHunterConfigured()).toBe(false);
      process.env.HUNTER_API_KEY = "[SENSITIVE]";
      expect(isHunterConfigured()).toBe(false);
      process.env.HUNTER_API_KEY = "test-hunter-key";
      expect(isHunterConfigured()).toBe(true);
    } finally {
      if (prior === undefined) delete process.env.HUNTER_API_KEY;
      else process.env.HUNTER_API_KEY = prior;
    }
  });

  it("only treats verification=valid as promote-ready", () => {
    expect(isHunterEmailPromoteReady("valid")).toBe(true);
    expect(isHunterEmailPromoteReady("VALID")).toBe(true);
    expect(isHunterEmailPromoteReady("accept_all")).toBe(false);
    expect(isHunterEmailPromoteReady("unknown")).toBe(false);
    expect(isHunterEmailPromoteReady(null)).toBe(false);
  });

  it("extracts LinkedIn handles from profile URLs", () => {
    expect(linkedinHandleFromUrl("https://www.linkedin.com/in/jane-doe/")).toBe("jane-doe");
    expect(linkedinHandleFromUrl("https://linkedin.com/in/jane-doe?trk=x")).toBe("jane-doe");
    expect(linkedinHandleFromUrl(null)).toBe(null);
  });
});
