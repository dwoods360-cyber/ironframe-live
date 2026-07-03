import { describe, expect, it } from "vitest";

import {
  buildWorkspaceInviteEmailHtml,
  buildWorkspaceInviteEmailInput,
  buildWorkspaceInviteEmailPlainText,
} from "@/app/lib/onboarding/workspaceInviteEmailContent";

describe("workspaceInviteEmailContent", () => {
  const input = buildWorkspaceInviteEmailInput({
    tenantDisplayName: "Acme Corporation",
    tenantSlug: "acmecorp",
    operatorEmail: "operator@acmecorp.com",
    initializeWorkspaceUrl: "http://localhost:3000/register/test-token",
    inviteExpiresAt: "2026-07-07T20:36:10.000Z",
  });

  it("builds plain-text invite without wireframes", () => {
    const text = buildWorkspaceInviteEmailPlainText(input);
    expect(text).toContain("ACTIVATE YOUR WORKSPACE");
    expect(text).toContain(input.initializeWorkspaceUrl);
    expect(text).toContain("INVITE_TARGET: operator@acmecorp.com");
    expect(text).toContain("TENANT_SLUG: acmecorp");
    expect(text).toContain("delivery@ironframegrc.com");
    expect(text).toContain("MSA");
    expect(text).not.toContain("Hazard Pipeline");
    expect(text).not.toContain("====");
  });

  it("builds minimal html with CTA button", () => {
    const html = buildWorkspaceInviteEmailHtml(input);
    expect(html).toContain("Activate Account Perimeter");
    expect(html).toContain(input.initializeWorkspaceUrl);
    expect(html).toContain("operator@acmecorp.com");
    expect(html).not.toContain("<table");
  });
});
