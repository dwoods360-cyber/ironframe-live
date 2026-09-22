import { describe, expect, it } from "vitest";

import { buildC1LockedEmailBody } from "@/app/lib/server/salesteamC1LockedCopy";
import { buildTouch2EmailBody } from "@/app/lib/salesTouch2Body";
import { hasC1FounderEmailSignature } from "@/app/lib/salesC1FounderSignature";
import { lintSalesHumanVoice } from "@/app/lib/salesHumanVoice";

function contentBlocks(body: string): string[] {
  return body
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);
}

describe("buildTouch2EmailBody layout", () => {
  it("uses the same four content beats + C1 signature as Touch 1", () => {
    const t1 = buildC1LockedEmailBody({
      fullName: "Ron Lisch",
      company: "CoreTek",
    }).body;
    const t2 = buildTouch2EmailBody({
      firstName: "Ron",
      criteriaFocus: "CoreDefend compliance evidence",
    });

    expect(hasC1FounderEmailSignature(t1)).toBe(true);
    expect(hasC1FounderEmailSignature(t2)).toBe(true);
    expect(lintSalesHumanVoice(t2).ok).toBe(true);

    const t1Blocks = contentBlocks(t1);
    const t2Blocks = contentBlocks(t2);
    // greeting + 4 beats + signature (economics may be one block with an internal newline)
    expect(t1Blocks[0]).toMatch(/^Hi /);
    expect(t2Blocks[0]).toBe("Hi Ron,");
    expect(t2Blocks.length).toBe(t1Blocks.length);

    expect(t2Blocks[1]).toMatch(/^Following up on this briefly:/);
    expect(t2Blocks[2]).toBe(
      "Ironframe is built for that: hard tenant walls, residual risk in whole cents, and exportable evidence — so leadership sees dollar exposure, not another color chart.",
    );
    expect(t2Blocks[3]).toMatch(/We're opening a small Command Design Partner cohort: \$4,999/);
    expect(t2Blocks[3]).toMatch(/\$35,000/);
    expect(t2Blocks[4]).toMatch(
      /the next step is a 10–15 minute workflow review on your evidence path — not a product tour/,
    );

    expect(t2).not.toMatch(/how do you keep/i);
    expect(t2).not.toMatch(/Still thinking about/i);
  });
});
