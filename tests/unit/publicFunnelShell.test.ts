import { describe, expect, it } from "vitest";

import {
  isPublicDarkShellPath,
  resolvePublicDarkShellSurface,
} from "@/app/lib/publicFunnelShell";

describe("publicFunnelShell", () => {
  it("treats guest funnel routes as public dark shell paths", () => {
    expect(isPublicDarkShellPath("/")).toBe(false);
    expect(isPublicDarkShellPath("/marketing")).toBe(true);
    expect(isPublicDarkShellPath("/login")).toBe(true);
    expect(isPublicDarkShellPath("/register/contact")).toBe(true);
    expect(isPublicDarkShellPath("/register/sample-token")).toBe(true);
    expect(isPublicDarkShellPath("/pricing")).toBe(true);
    expect(isPublicDarkShellPath("/solutions")).toBe(true);
    expect(isPublicDarkShellPath("/solutions/enterprise")).toBe(true);
    expect(isPublicDarkShellPath("/tools")).toBe(true);
    expect(isPublicDarkShellPath("/tools/third-party-criticality-questionnaire")).toBe(true);
    expect(isPublicDarkShellPath("/product-demo")).toBe(true);
    expect(isPublicDarkShellPath("/trust-center")).toBe(true);
  });

  it("does not treat dashboard routes as public dark shell paths", () => {
    expect(isPublicDarkShellPath("/get-started")).toBe(false);
    expect(isPublicDarkShellPath("/admin/onboarding")).toBe(false);
  });

  it("resolves surface markers for marketing and invite registration", () => {
    expect(resolvePublicDarkShellSurface("/marketing")).toBe("public-landing");
    expect(resolvePublicDarkShellSurface("/register/token-123")).toBe("invite-registration");
    expect(resolvePublicDarkShellSurface("/login")).toBe("public-funnel");
  });
});
