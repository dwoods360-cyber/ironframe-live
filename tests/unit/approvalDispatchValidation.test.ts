import { describe, expect, it } from "vitest";

import {
  SALES_SMS_MAX_CHARS,
  adminOnboardingProvisionHref,
  isIronleadsLocalEmail,
  isSalesDispatchHoldCompany,
  preferredSalesDispatchChannel,
  validateApprovalDispatch,
} from "@/app/lib/approvalDispatchValidation";

const LOCKED_EMAIL_BODY = `
Hi — Command Design Partner is $4,999 for a 90-day co-builder seat.
Open to a 10–15 minute workflow review on evidence / board-report pain?
`.trim();

describe("validateApprovalDispatch", () => {
  it("requires email for EMAIL channel", () => {
    const result = validateApprovalDispatch({
      draftKind: "SALES",
      channel: "EMAIL",
      body: LOCKED_EMAIL_BODY,
      recipientEmail: "",
      recipientPhone: null,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /email/i.test(e))).toBe(true);
  });

  it("blocks @ironleads.local EMAIL destinations", () => {
    const result = validateApprovalDispatch({
      draftKind: "SALES",
      channel: "EMAIL",
      body: LOCKED_EMAIL_BODY,
      recipientEmail: "suspect+abc@ironleads.local",
      recipientPhone: "+15551234567",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /ironleads\.local/i.test(e))).toBe(true);
  });

  it("blocks BlueRadius HOLD companies", () => {
    const result = validateApprovalDispatch({
      draftKind: "SALES",
      channel: "EMAIL",
      body: LOCKED_EMAIL_BODY,
      recipientEmail: "info@blueradius.io",
      recipientPhone: null,
      company: "BlueRadius Cyber",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /HOLD/i.test(e))).toBe(true);
  });

  it("blocks Pivot Point HOLD companies (OSCAR GRC overlap)", () => {
    const result = validateApprovalDispatch({
      draftKind: "SALES",
      channel: "EMAIL",
      body: LOCKED_EMAIL_BODY,
      recipientEmail: "buyer@example.com",
      recipientPhone: null,
      company: "CBIZ Pivot Point Security",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /HOLD/i.test(e))).toBe(true);
  });

  it("blocks UltraViolet Cyber HOLD (wrong Path B seat / platform MSSP)", () => {
    const result = validateApprovalDispatch({
      draftKind: "SALES",
      channel: "EMAIL",
      body: LOCKED_EMAIL_BODY,
      recipientEmail: "ira.goldstein@uvcyber.com",
      recipientPhone: null,
      company: "Ultraviolet Cyber",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /HOLD/i.test(e))).toBe(true);
    expect(isSalesDispatchHoldCompany("UltraViolet Cyber")).toBe(true);
  });

  it("requires acknowledge for operator dry-run inbox", () => {
    const blocked = validateApprovalDispatch({
      draftKind: "SALES",
      channel: "EMAIL",
      body: LOCKED_EMAIL_BODY,
      recipientEmail: "dwoods360@gmail.com",
      recipientPhone: null,
      company: "Acme Managed GRC LLC",
    });
    expect(blocked.ok).toBe(false);

    const ok = validateApprovalDispatch({
      draftKind: "SALES",
      channel: "EMAIL",
      body: LOCKED_EMAIL_BODY,
      recipientEmail: "dwoods360@gmail.com",
      recipientPhone: null,
      company: "Acme Managed GRC LLC",
      acknowledgeOperatorSelfDispatch: true,
    });
    expect(ok).toEqual({ ok: true, errors: [] });
  });

  it("enforces Sales EMAIL C1 locks", () => {
    const noPrice = validateApprovalDispatch({
      draftKind: "SALES",
      channel: "EMAIL",
      body: "Hi — open to a workflow review sometime?",
      recipientEmail: "buyer@acme.com",
      recipientPhone: null,
      company: "Acme",
    });
    expect(noPrice.ok).toBe(false);

    const freePilot = validateApprovalDispatch({
      draftKind: "SALES",
      channel: "EMAIL",
      body: "Command Design Partner is $4,999. Free PoC first, then workflow review.",
      recipientEmail: "buyer@acme.com",
      recipientPhone: null,
      company: "Acme",
    });
    expect(freePilot.ok).toBe(false);
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
      company: "Acme Managed GRC LLC",
    });
    expect(result).toEqual({ ok: true, errors: [] });
  });

  it("prefers SMS for ironleads.local when phone present", () => {
    expect(isIronleadsLocalEmail("x@ironleads.local")).toBe(true);
    expect(
      preferredSalesDispatchChannel({
        email: "x@ironleads.local",
        phone: "+15551234567",
        current: "EMAIL",
      }),
    ).toBe("SMS");
    expect(isSalesDispatchHoldCompany("BlueRadius Cyber")).toBe(true);
    expect(isSalesDispatchHoldCompany("CBIZ Pivot Point Security")).toBe(true);
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
