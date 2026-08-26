import { describe, expect, it } from "vitest";

import { lintSalesHumanVoice } from "@/app/lib/salesHumanVoice";
import {
  buildOutreachPriceReplyEmail,
  buildOutreachSoftReplyEmail,
  buildOutreachYesReplyEmail,
} from "@/lib/gtm/outreachReplyCopy";

describe("outreachReplyCopy", () => {
  it("builds a YES reply that passes human-voice lint", () => {
    const mail = buildOutreachYesReplyEmail({
      firstName: "Jeffrey",
      company: "AT-NET Services",
      motionHint: "HIPAA / CMMC / PCI client isolation",
      bookingUrl: null,
    });
    expect(mail.subject).toContain("AT-NET");
    expect(mail.text).toContain("Jeffrey");
    expect(mail.text).toContain("$4,999");
    expect(mail.text).toContain("workflow review");
    expect(mail.text).not.toMatch(/\bPath B\b/i);
    expect(mail.text).toContain("dereck@ironframegrc.com");
    expect(lintSalesHumanVoice(mail.text).ok).toBe(true);
  });

  it("builds soft and price variants without demo CTAs", () => {
    const soft = buildOutreachSoftReplyEmail({
      firstName: "Karen",
      company: "Assura",
      bookingUrl: "https://example.com/book",
    });
    const price = buildOutreachPriceReplyEmail({
      firstName: "Karen",
      company: "Assura",
      bookingUrl: null,
    });
    expect(soft.text).toContain("example.com/book");
    expect(price.text).toContain("$35,000");
    expect(soft.text).not.toMatch(/Request Demo|book a demo/i);
    expect(price.text).not.toMatch(/\bPath B\b/i);
    expect(lintSalesHumanVoice(soft.text).ok).toBe(true);
    expect(lintSalesHumanVoice(price.text).ok).toBe(true);
  });
});
