import { describe, expect, it } from "vitest";

import { lintSalesHumanVoice } from "@/app/lib/salesHumanVoice";
import { buildOutreachReplyReceiptEmail } from "@/lib/gtm/outreachReplyReceiptCopy";
import { buildOutreachReplySourceRef } from "@/lib/gtm/outreachReplyIds";
import { resolveSalesFromEmail } from "@/lib/gtm/salesFromAddress";

describe("outreachReplyReceiptCopy", () => {
  it("builds a light receipt without Path B commercials", () => {
    const mail = buildOutreachReplyReceiptEmail({
      firstName: "Jeffrey",
      company: "AT-NET Services",
      bookingUrl: null,
    });
    expect(mail.subject).toContain("AT-NET");
    expect(mail.text).toContain("Jeffrey");
    expect(mail.text).toContain("workflow review");
    expect(mail.text).not.toMatch(/\$4,?999/);
    expect(mail.text).not.toMatch(/\bPath B\b/i);
    expect(mail.text).not.toMatch(/book a demo/i);
    expect(lintSalesHumanVoice(mail.text).ok).toBe(true);
  });
});

describe("outreachReplyIds", () => {
  it("builds stable source refs from message-id", () => {
    const a = buildOutreachReplySourceRef({
      fromEmail: "buyer@mssp.com",
      messageId: "<abc-123@mail.example>",
      source: "resend",
    });
    const b = buildOutreachReplySourceRef({
      fromEmail: "other@x.com",
      messageId: "<abc-123@mail.example>",
      source: "manual",
    });
    expect(a).toBe(b);
    expect(a.startsWith("outreach-reply:")).toBe(true);
  });
});

describe("salesFromAddress", () => {
  it("defaults to dereck@ironframegrc.com", () => {
    const prev = process.env.SALES_FROM_EMAIL;
    delete process.env.SALES_FROM_EMAIL;
    delete process.env.PARTNERS_FROM_EMAIL;
    delete process.env.IRONCAST_FROM_EMAIL;
    expect(resolveSalesFromEmail()).toBe("dereck@ironframegrc.com");
    if (prev !== undefined) process.env.SALES_FROM_EMAIL = prev;
  });

  it("refuses Gmail From", () => {
    const prev = process.env.SALES_FROM_EMAIL;
    process.env.SALES_FROM_EMAIL = "dwoods360@gmail.com";
    expect(() => resolveSalesFromEmail()).toThrow(/Gmail/i);
    if (prev !== undefined) process.env.SALES_FROM_EMAIL = prev;
    else delete process.env.SALES_FROM_EMAIL;
  });
});
