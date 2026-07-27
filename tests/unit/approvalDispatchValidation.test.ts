import { describe, expect, it } from "vitest";

import {
  SALES_SMS_MAX_CHARS,
  adminOnboardingProvisionHref,
  validateApprovalDispatch,
} from "@/app/lib/approvalDispatchValidation";

describe("validateApprovalDispatch", () => {
  it("requires email for EMAIL channel", () => {
    const result = validateApprovalDispatch({
      draftKind: "SALES",
      channel: "EMAIL",
      body: "Hello",
      recipientEmail: "",
      recipientPhone: null,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /email/i.test(e))).toBe(true);
  });

  it("blocks Sales SMS over max length and with URLs", () => {
    const long = "x".repeat(SALES_SMS_MAX_CHARS + 1);
    const lengthFail = validateApprovalDispatch({
      draftKind: "SALES",
      channel: "SMS",
      body: long,
      recipientEmail: "a@b.com",
      recipientPhone: "+15551234567",
    });
    expect(lengthFail.ok).toBe(false);

    const urlFail = validateApprovalDispatch({
      draftKind: "SALES",
      channel: "SMS",
      body: "See https://ironframegrc.com/pricing",
      recipientEmail: "a@b.com",
      recipientPhone: "+15551234567",
    });
    expect(urlFail.ok).toBe(false);
    expect(urlFail.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("accepts locked Sales SMS body", () => {
    const body =
      "Hi Team, Dereck @ Ironframe. Opening design-partner seats for MSSPs replacing heatmaps w/ dollar risk. Open to a 10–15 min workflow review? Reply YES or STOP.";
    expect(body.length).toBeLessThanOrEqual(SALES_SMS_MAX_CHARS);
    const result = validateApprovalDispatch({
      draftKind: "SALES",
      channel: "SMS",
      body,
      recipientEmail: "a@b.com",
      recipientPhone: "+15551234567",
    });
    expect(result).toEqual({ ok: true, errors: [] });
  });
});

describe("adminOnboardingProvisionHref", () => {
  it("encodes name email slug", () => {
    expect(
      adminOnboardingProvisionHref({
        name: "Acme Corp",
        email: "ciso@acme.com",
        slug: "acmecorp",
      }),
    ).toBe(
      "/admin/onboarding?name=Acme+Corp&email=ciso%40acme.com&slug=acmecorp#onboarding-controls",
    );
  });

  it("includes AGREED handoff token when present", () => {
    expect(
      adminOnboardingProvisionHref({
        name: "Acme Corp",
        email: "ciso@acme.com",
        slug: "acmecorp",
        handoff: "tok_abc",
      }),
    ).toBe(
      "/admin/onboarding?name=Acme+Corp&email=ciso%40acme.com&slug=acmecorp&handoff=tok_abc#onboarding-controls",
    );
  });
});
