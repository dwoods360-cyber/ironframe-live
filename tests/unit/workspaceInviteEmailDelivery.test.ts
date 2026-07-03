import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  buildRegisterInvitationUrl,
  buildWorkspaceInviteLoginUrl,
  isDevBrowserInviteHandoffEnabled,
  isResendSenderDomainVerificationError,
  sendWorkspaceInviteEmailCore,
  summarizeWorkspaceInviteEmailDelivery,
} from "@/app/lib/server/workspaceInviteEmailDelivery";

const resendSendMock = vi.fn();

vi.mock("resend", () => {
  class MockResend {
    emails = { send: resendSendMock };
  }
  return { Resend: MockResend };
});

vi.mock("@/app/lib/tenantSlugRegistry", () => ({
  lookupTenantBySlug: vi.fn().mockResolvedValue({ name: "Acme Corporation" }),
}));

describe("workspaceInviteEmailDelivery", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("NODE_ENV", "development");
    resendSendMock.mockReset();
  });

  it("builds tenant-scoped login invite URL when slug is provided", () => {
    expect(buildWorkspaceInviteLoginUrl("abc-token", "run5")).toBe(
      "http://run5.lvh.me:3000/login?invite=abc-token",
    );
  });

  it("builds tenant-scoped register URL when slug is provided", () => {
    expect(buildRegisterInvitationUrl("abc-token", "run5")).toBe(
      "http://run5.lvh.me:3000/register/abc-token",
    );
  });

  it("falls back to public app origin without tenant slug", () => {
    expect(buildRegisterInvitationUrl("abc-token")).toBe("http://localhost:3000/register/abc-token");
  });

  it("enables dev browser handoff outside production by default", () => {
    expect(isDevBrowserInviteHandoffEnabled()).toBe(true);
    vi.stubEnv("IRONFRAME_DISABLE_DEV_INVITE_HANDOFF", "1");
    expect(isDevBrowserInviteHandoffEnabled()).toBe(false);
  });

  it("uses dev browser handoff when RESEND_API_KEY is missing in development", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const result = await sendWorkspaceInviteEmailCore({
      email: "operator@acmecorp.com",
      tenantSlug: "acmecorp",
      registerToken: "abc-token",
      tenantDisplayName: "Acme Corporation",
      inviteExpiresAt: "2026-07-07T20:36:10.000Z",
    });
    expect(result).toEqual({ ok: true, deliveryChannel: "dev-browser-handoff" });
    expect(summarizeWorkspaceInviteEmailDelivery(result)).toEqual({
      sent: false,
      deliveryChannel: "dev-browser-handoff",
      error: expect.stringContaining("Local dev"),
    });
  });

  it("detects Resend sender domain verification errors", () => {
    expect(
      isResendSenderDomainVerificationError(
        "The ironframegrc.com domain is not verified. Please, add and verify your domain on https://resend.com/domains",
      ),
    ).toBe(true);
    expect(isResendSenderDomainVerificationError("Invalid API key")).toBe(false);
  });

  it("detects Resend sandbox recipient restriction errors", async () => {
    const { isResendSandboxRecipientRestrictionError } = await import(
      "@/app/lib/server/workspaceInviteEmailDelivery"
    );
    expect(
      isResendSandboxRecipientRestrictionError(
        "You can only send testing emails to your own email address (dwoods360@gmail.com).",
      ),
    ).toBe(true);
  });

  it("fails on unverified domain when sandbox fallback is disabled (production path)", async () => {
    resendSendMock.mockResolvedValueOnce({
      data: null,
      error: {
        message:
          "The ironframegrc.com domain is not verified. Please, add and verify your domain on https://resend.com/domains",
      },
    });

    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("IRONFRAME_DISABLE_DEV_INVITE_HANDOFF", "1");
    const result = await sendWorkspaceInviteEmailCore({
      email: "operator@acmecorp.com",
      tenantSlug: "acmecorp",
      registerToken: "abc-token",
      tenantDisplayName: "Acme Corporation",
      inviteExpiresAt: "2026-07-07T20:36:10.000Z",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("ironframegrc.com");
      expect(result.error).toContain("verified sending domain");
    }
    expect(resendSendMock).toHaveBeenCalledTimes(1);
  });

  it("uses dev browser handoff when sandbox blocks non-owner recipients and fallback is enabled", async () => {
    resendSendMock
      .mockResolvedValueOnce({
        data: null,
        error: {
          message:
            "The ironframegrc.com domain is not verified. Please, add and verify your domain on https://resend.com/domains",
        },
      })
      .mockResolvedValueOnce({
        data: null,
        error: {
          message:
            "You can only send testing emails to your own email address (dwoods360@gmail.com). To send emails to other recipients, please verify a domain at resend.com/domains.",
        },
      });

    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("WORKSPACE_INVITE_ALLOW_SANDBOX_FALLBACK", "1");
    const result = await sendWorkspaceInviteEmailCore({
      email: "operator@acmecorp.com",
      tenantSlug: "acmecorp",
      registerToken: "abc-token",
      tenantDisplayName: "Acme Corporation",
      inviteExpiresAt: "2026-07-07T20:36:10.000Z",
    });
    expect(result).toEqual({ ok: true, deliveryChannel: "dev-browser-handoff" });
    expect(resendSendMock).toHaveBeenCalledTimes(2);
  });

  it("dispatches via Resend when API key is configured", async () => {
    resendSendMock.mockResolvedValue({
      data: { id: "email_123" },
      error: null,
    });

    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    const result = await sendWorkspaceInviteEmailCore({
      email: "operator@acmecorp.com",
      tenantSlug: "acmecorp",
      registerToken: "abc-token",
      tenantDisplayName: "Acme Corporation",
      inviteExpiresAt: "2026-07-07T20:36:10.000Z",
    });
    expect(result).toEqual({ ok: true, resendId: "email_123", deliveryChannel: "resend" });
    expect(resendSendMock).toHaveBeenCalledTimes(1);
  });

  it("retries with Resend sandbox sender when custom From domain is unverified and sandbox fallback is enabled", async () => {
    resendSendMock
      .mockResolvedValueOnce({
        data: null,
        error: {
          message:
            "The ironframegrc.com domain is not verified. Please, add and verify your domain on https://resend.com/domains",
        },
      })
      .mockResolvedValueOnce({
        data: { id: "email_sandbox_456" },
        error: null,
      });

    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("WORKSPACE_INVITE_ALLOW_SANDBOX_FALLBACK", "1");
    const result = await sendWorkspaceInviteEmailCore({
      email: "operator@acmecorp.com",
      tenantSlug: "acmecorp",
      registerToken: "abc-token",
      tenantDisplayName: "Acme Corporation",
      inviteExpiresAt: "2026-07-07T20:36:10.000Z",
    });
    expect(result).toEqual({ ok: true, resendId: "email_sandbox_456", deliveryChannel: "resend" });
    expect(resendSendMock).toHaveBeenCalledTimes(2);
    expect(String(resendSendMock.mock.calls[1]?.[0]?.from)).toContain("onboarding@resend.dev");
  });
});
