import { describe, expect, it } from "vitest";

import {
  isSnovConfigured,
  isSnovEmailPromoteReady,
  pickSnovEmailHit,
} from "@/app/lib/server/snovEnrichmentClient";

describe("snovEnrichmentClient", () => {
  it("reports configured only when both Snov credentials are real", () => {
    const priorId = process.env.SNOV_CLIENT_ID;
    const priorSecret = process.env.SNOV_CLIENT_SECRET;
    try {
      delete process.env.SNOV_CLIENT_ID;
      delete process.env.SNOV_CLIENT_SECRET;
      expect(isSnovConfigured()).toBe(false);
      process.env.SNOV_CLIENT_ID = "id";
      process.env.SNOV_CLIENT_SECRET = "[SENSITIVE]";
      expect(isSnovConfigured()).toBe(false);
      process.env.SNOV_CLIENT_SECRET = "secret";
      expect(isSnovConfigured()).toBe(true);
    } finally {
      if (priorId === undefined) delete process.env.SNOV_CLIENT_ID;
      else process.env.SNOV_CLIENT_ID = priorId;
      if (priorSecret === undefined) delete process.env.SNOV_CLIENT_SECRET;
      else process.env.SNOV_CLIENT_SECRET = priorSecret;
    }
  });

  it("promotes only smtp_status valid and rejects catch-all, webmail, and disposable", () => {
    expect(isSnovEmailPromoteReady({ emailStatus: "valid" })).toBe(true);
    expect(isSnovEmailPromoteReady({ emailStatus: "unknown" })).toBe(false);
    expect(isSnovEmailPromoteReady({ emailStatus: "not_valid" })).toBe(false);
    expect(isSnovEmailPromoteReady({ emailStatus: "valid", isWebmail: true })).toBe(false);
    expect(isSnovEmailPromoteReady({ emailStatus: "valid", isDisposable: true })).toBe(false);
    expect(isSnovEmailPromoteReady({ emailStatus: "valid", isGibberish: true })).toBe(false);
  });

  it("prefers a valid address over an unknown catch-all in the same payload", () => {
    const picked = pickSnovEmailHit({
      status: "completed",
      data: [
        {
          people: "Shaun Andrews",
          result: [
            { email: "sandrews@tpx.com", smtp_status: "unknown", unknown_status_reason: "catchall" },
            { email: "shaun.andrews@tpx.com", smtp_status: "valid", is_webmail: false },
          ],
        },
      ],
    });
    expect(picked?.email).toBe("shaun.andrews@tpx.com");
    expect(picked?.emailStatus).toBe("valid");
  });
});
