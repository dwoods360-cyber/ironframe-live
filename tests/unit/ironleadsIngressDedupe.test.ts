import { describe, expect, it } from "vitest";

import {
  normalizeAccountDomain,
  normalizeSuspectCompanyKey,
} from "@/app/lib/ingress/ironleadsSuspectIdentity";

describe("ironleadsIngress company/domain normalize", () => {
  it("normalizes company keys for case-insensitive matching", () => {
    expect(normalizeSuspectCompanyKey("  U.S. Department of Health ")).toBe(
      "u.s. department of health",
    );
  });

  it("strips scheme, path, and www from account domains", () => {
    expect(normalizeAccountDomain("https://www.hhs.gov/ocr/breach")).toBe("hhs.gov");
    expect(normalizeAccountDomain("www.cisco.com")).toBe("cisco.com");
    expect(normalizeAccountDomain(null)).toBeNull();
  });
});
