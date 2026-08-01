import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:dns/promises", () => ({
  default: {
    resolveMx: vi.fn(),
  },
}));

import dns from "node:dns/promises";
import {
  checkMailboxHygiene,
  clearMailboxHygieneCache,
  validateEmailFormat,
} from "@/app/lib/server/emailMailboxHygiene";

describe("emailMailboxHygiene", () => {
  afterEach(() => {
    clearMailboxHygieneCache();
    vi.mocked(dns.resolveMx).mockReset();
  });

  it("validates format without network", () => {
    expect(validateEmailFormat("buyer@acme.com")).toBe(true);
    expect(validateEmailFormat("not-an-email")).toBe(false);
    expect(validateEmailFormat("a@b..com")).toBe(false);
    expect(validateEmailFormat("spa ces@acme.com")).toBe(false);
  });

  it("passes when MX records exist", async () => {
    vi.mocked(dns.resolveMx).mockResolvedValue([
      { exchange: "mx.acme.com", priority: 10 },
    ]);
    const result = await checkMailboxHygiene("buyer@acme.com");
    expect(result.ok).toBe(true);
    expect(result.reason).toBe("mx_ok");
    expect(result.mxHosts).toEqual(["mx.acme.com"]);
  });

  it("fails when domain has no MX", async () => {
    const err = Object.assign(new Error("queryMx ENODATA"), { code: "ENODATA" });
    vi.mocked(dns.resolveMx).mockRejectedValue(err);
    const result = await checkMailboxHygiene("nobody@no-mx-example.invalid");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("mx_missing");
  });

  it("does not treat format failure as MX failure", async () => {
    const result = await checkMailboxHygiene("bad@@acme.com");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("format_invalid");
    expect(dns.resolveMx).not.toHaveBeenCalled();
  });
});
