import { describe, expect, it } from "vitest";

import { hasC1FounderEmailSignature } from "@/app/lib/salesC1FounderSignature";
import { lintSalesHumanVoice } from "@/app/lib/salesHumanVoice";
import { looksLikeTouchEconomicsBody } from "@/app/lib/salesTouch3Body";
import {
  buildTouch4EmailBody,
  buildTouch4Subject,
  looksLikeTouch4BreakupBody,
} from "@/app/lib/salesTouch4Body";
import { validateApprovalDispatch } from "@/app/lib/approvalDispatchValidation";

describe("buildTouch4EmailBody", () => {
  it("closes the Design Partner thread without a price or workflow pitch", () => {
    const body = buildTouch4EmailBody({
      firstName: "Luis",
      company: "Alvarez Technology Group",
      motion: "managed IT compliance evidence",
    });

    expect(hasC1FounderEmailSignature(body)).toBe(true);
    expect(looksLikeTouch4BreakupBody(body)).toBe(true);
    expect(looksLikeTouchEconomicsBody(body)).toBe(false);
    expect(body).toMatch(/^Hi Luis,/);
    expect(body).toMatch(/Alvarez Technology Group/);
    expect(body).not.toMatch(/\$4,?999/);
    expect(body).not.toMatch(/workflow review/i);
    expect(body.split(/\n\s*\n/).length).toBeLessThanOrEqual(6);

    const voice = lintSalesHumanVoice(body, { allowMissingPeerCta: true });
    expect(voice.ok).toBe(true);

    const gate = validateApprovalDispatch({
      draftKind: "SALES",
      channel: "EMAIL",
      body,
      recipientEmail: "buyer@example.com",
      recipientPhone: null,
      company: "Alvarez Technology Group",
      expectedTouch: "TOUCH4",
    });
    expect(gate.ok).toBe(true);
  });

  it("threads the subject from the prior email", () => {
    expect(
      buildTouch4Subject({
        company: "Alvarez Technology Group",
        priorSubject: "Re: client-isolated evidence — Alvarez",
      }),
    ).toBe("Re: client-isolated evidence — Alvarez");
  });
});
