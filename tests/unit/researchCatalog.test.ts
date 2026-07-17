import { describe, expect, it } from "vitest";

import {
  listEditorialPolicyDocs,
  listResearchPapers,
  listResearchSeries,
} from "../../app/lib/governanceFrame/researchCatalog";

describe("researchCatalog", () => {
  it("lists GF research papers from the canonical package tree", () => {
    const papers = listResearchPapers();
    const gf001 = papers.find((paper) => paper.researchId === "GF-2026-001");
    expect(gf001).toBeTruthy();
    expect(gf001?.slug).toBe("GF-2026-001-evolution-of-grc");
    expect(gf001?.isPublic).toBe(false);
    expect(gf001?.status.toUpperCase()).toContain("DRAFT");
  });

  it("lists the control-first-grc series with published installment slugs", () => {
    const series = listResearchSeries().find((entry) => entry.seriesId === "control-first-grc");
    expect(series).toBeTruthy();
    expect(series?.installments.length).toBeGreaterThanOrEqual(3);
    expect(series?.installments.some((item) => item.publishedSlug?.includes("market-grc"))).toBe(
      true,
    );
  });

  it("marks placeholder editorial policy docs as not public-ready", () => {
    const methodology = listEditorialPolicyDocs().find((doc) => doc.id === "research-methodology");
    expect(methodology).toBeTruthy();
    expect(methodology?.ready).toBe(false);
  });
});
