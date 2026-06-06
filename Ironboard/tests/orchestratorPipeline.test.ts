import { describe, expect, it } from "vitest";

import { corporateBoardGraph } from "../src/orchestrator.js";
import { graphStateToBoardState } from "../src/state.js";
import { FLAGSHIP_IRONFRAME_SAAS, INITIAL_PORTFOLIO } from "../src/seed.js";
import { ContentFirewallRejectedError } from "../src/io/safeDocsWriter.js";
import { validateOutboundContent } from "../src/validation/contentFirewall.js";

describe("corporate board graph — documentation pipeline", () => {
  it("runs Trainer and Writer nodes after legal clearance with firewall-safe artifacts", async () => {
    const finalGraphState = await corporateBoardGraph.invoke({
      products: INITIAL_PORTFOLIO,
      activeTargetProductId: FLAGSHIP_IRONFRAME_SAAS.id,
      businessObjective: "Expand cyber insurance underwriting module.",
      financialProjectionsCents: "500000000",
      legalReviewCleared: false,
      departmentalApprovals: [],
      executiveSummaryLog: [],
      activeSpeaker: "CEO",
      documentationArtifacts: [],
    });

    const finalState = graphStateToBoardState(finalGraphState);
    expect(finalState.legalReviewCleared).toBe(true);
    expect(finalGraphState.documentationArtifacts?.length).toBeGreaterThan(0);
    expect(finalGraphState.executiveSummaryLog.some((l) => l.includes("[Trainer]"))).toBe(true);
    expect(finalGraphState.executiveSummaryLog.some((l) => l.includes("[Writer]"))).toBe(true);
  });

  it("intercepts ungrounded float cent payloads before hub write", () => {
    const bad = validateOutboundContent(
      "financialProjectionsCents: 470000000.99\nref: docs/hub.md",
      { agentRole: "WRITER" },
    );
    expect(bad.ok).toBe(false);
    expect(() =>
      validateOutboundContent("premium: $5.9M float", { agentRole: "WRITER" }),
    ).not.toThrow();
    expect(
      validateOutboundContent("premium: $5.9M float", { agentRole: "WRITER" }).ok,
    ).toBe(false);
  });
});

describe("ContentFirewallRejectedError", () => {
  it("surfaces violation messages for pipeline failure", () => {
    const err = new ContentFirewallRejectedError(["float detected"], "training/x.html");
    expect(err.message).toContain("Blocked write");
    expect(err.violations).toContain("float detected");
  });
});
