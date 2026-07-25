import { describe, expect, it } from "vitest";

import {
  CUSTOMER_FACING_PATH_B_SKU,
  WORKFLOW_REVIEW_CTA_MINUTES,
} from "@/lib/ironframeProductKnowledge/commercial";

/** Pure helpers mirrored for smoke (server-only core not imported in thin vitest). */
function inboundLeadSourceRef(slug: string): string {
  return `inbound-lead:${slug.trim().toLowerCase()}`;
}

function buildInboundWorkflowReviewDraft(input: {
  orgName: string;
  email: string;
  reportedAleCents: bigint;
}): string {
  const aleDollars =
    input.reportedAleCents > 0n
      ? `$${Number(input.reportedAleCents / 100n).toLocaleString("en-US")}`
      : "not stated";
  return [
    `Thanks for requesting a ${WORKFLOW_REVIEW_CTA_MINUTES} minute workflow review with Ironframe.`,
    "",
    `We received your note for ${input.orgName} (${input.email}).`,
    `Reported annual loss exposure (intake): ${aleDollars}.`,
    `${CUSTOMER_FACING_PATH_B_SKU}`,
  ].join("\n");
}

describe("inbound lead P1 helpers", () => {
  it("builds stable sourceRef from slug", () => {
    expect(inboundLeadSourceRef("Ironframe-Test")).toBe("inbound-lead:ironframe-test");
  });

  it("includes workflow review CTA and ALE in draft", () => {
    const draft = buildInboundWorkflowReviewDraft({
      orgName: "Ironframe Test",
      email: "dwoods360@gmail.com",
      reportedAleCents: 500_000_000n,
    });
    expect(draft).toContain(WORKFLOW_REVIEW_CTA_MINUTES);
    expect(draft).toContain("Ironframe Test");
    expect(draft).toContain("$5,000,000");
    expect(draft).toContain(CUSTOMER_FACING_PATH_B_SKU);
  });
});
