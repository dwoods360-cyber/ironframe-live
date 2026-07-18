import { describe, expect, it } from "vitest";

import {
  BRIEFING_QUEUE_DIR,
  buildPublishedGovernanceFrameFederationBlock,
  buildPublishedGovernanceFrameKnowledgeBinding,
  listPublishedResearchIndex,
} from "../../lib/governanceFrame/publishedResearchKnowledge";

describe("publishedResearchKnowledge", () => {
  it("indexes published briefings without reading the quarantine queue", () => {
    const index = listPublishedResearchIndex();
    expect(index.length).toBeGreaterThan(0);
    expect(index.every((item) => item.publicUrl.includes("/briefings/"))).toBe(true);
    expect(index.every((item) => !item.slug.includes("draft"))).toBe(true);
  });

  it("builds a product-spine binding that forbids quarantine citation", () => {
    const binding = buildPublishedGovernanceFrameKnowledgeBinding();
    expect(binding).toContain("GOVERNANCE FRAME RESEARCH ENCYCLOPEDIA");
    expect(binding).toContain("research.ironframegrc.com");
    expect(binding).toContain(BRIEFING_QUEUE_DIR);
    expect(binding).toMatch(/NEVER read or cite/i);
    expect(binding).toContain("GF-2026-001");
  });

  it("builds an IronBoard federation block with excerpts", () => {
    const block = buildPublishedGovernanceFrameFederationBlock();
    expect(block).toContain("PUBLISHED ONLY");
    expect(block).toContain("Published briefing excerpts");
    expect(block).not.toContain("docs/briefing-queue/");
  });
});
