import { describe, expect, it } from "vitest";

import {
  buildTouch3EmailBody,
  buildTouch3Subject,
  looksLikeTouch3ValueDropBody,
  looksLikeTouchEconomicsBody,
} from "@/app/lib/salesTouch3Body";
import { hasC1FounderEmailSignature } from "@/app/lib/salesC1FounderSignature";
import { lintSalesHumanVoice } from "@/app/lib/salesHumanVoice";

describe("buildTouch3EmailBody", () => {
  it("ships Value Drop three-checks with C1 signature and no economics", () => {
    const body = buildTouch3EmailBody({
      firstName: "Mike",
      company: "Appalachia Technologies",
      motion: "CMMC DIB managed services",
    });

    expect(hasC1FounderEmailSignature(body)).toBe(true);
    expect(looksLikeTouch3ValueDropBody(body)).toBe(true);
    expect(looksLikeTouchEconomicsBody(body)).toBe(false);
    expect(body).toMatch(/^Hi Mike,/);
    expect(body).toMatch(/CMMC \/ DIB teams/);
    expect(body).toMatch(/\b1\.\s+/);
    expect(body).toMatch(/\b2\.\s+/);
    expect(body).toMatch(/\b3\.\s+/);
    expect(body).not.toMatch(/\$4,?999/);
    expect(body).not.toMatch(/workflow review/i);
    expect(body).not.toMatch(/\$35,?000/);

    const voice = lintSalesHumanVoice(body, { allowMissingPeerCta: true });
    expect(voice.ok).toBe(true);
  });

  it("threads subject from prior Touch 1 when present", () => {
    expect(
      buildTouch3Subject({
        company: "Appalachia Technologies",
        touch1Subject: "client-isolated CMMC evidence — Appalachia",
      }),
    ).toBe("Re: client-isolated CMMC evidence — Appalachia");
  });
});
