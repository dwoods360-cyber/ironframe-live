import { describe, expect, it } from "vitest";

import {
  isGetProspectConfigured,
  isGetProspectEmailPromoteReady,
  parseGetProspectFindPayload,
} from "@/app/lib/server/getprospectEnrichmentClient";

describe("getprospectEnrichmentClient", () => {
  it("reports configured only when GETPROSPECT_API_KEY is a real value", () => {
    const prior = process.env.GETPROSPECT_API_KEY;
    try {
      delete process.env.GETPROSPECT_API_KEY;
      expect(isGetProspectConfigured()).toBe(false);
      process.env.GETPROSPECT_API_KEY = "[SENSITIVE]";
      expect(isGetProspectConfigured()).toBe(false);
      process.env.GETPROSPECT_API_KEY = "test-getprospect-key";
      expect(isGetProspectConfigured()).toBe(true);
    } finally {
      if (prior === undefined) delete process.env.GETPROSPECT_API_KEY;
      else process.env.GETPROSPECT_API_KEY = prior;
    }
  });

  it("promotes only mailbox status valid and rejects free inboxes", () => {
    expect(isGetProspectEmailPromoteReady({ emailStatus: "valid" })).toBe(true);
    expect(isGetProspectEmailPromoteReady({ emailStatus: "valid", freeEmail: true })).toBe(false);
    expect(isGetProspectEmailPromoteReady({ emailStatus: "not_found" })).toBe(false);
    expect(isGetProspectEmailPromoteReady({ emailStatus: "unknown" })).toBe(false);
    expect(isGetProspectEmailPromoteReady({ emailStatus: "accept_all" })).toBe(false);
  });

  it("reads a valid find and keeps a catch-all miss off the email field", () => {
    const valid = parseGetProspectFindPayload({
      success: true,
      data: {
        email: "emily.carter@intercom.com",
        status: "valid",
        domain: "intercom.com",
        domain_status: "valid",
        free_email: false,
      },
    });
    expect(valid?.email).toBe("emily.carter@intercom.com");
    expect(isGetProspectEmailPromoteReady(valid!)).toBe(true);

    const catchAll = parseGetProspectFindPayload({
      success: true,
      data: { status: "not_found", domain: "tpx.com", domain_status: "accept_all" },
    });
    expect(catchAll?.email).toBeNull();
    expect(catchAll?.domainStatus).toBe("accept_all");
    expect(isGetProspectEmailPromoteReady(catchAll!)).toBe(false);
  });
});