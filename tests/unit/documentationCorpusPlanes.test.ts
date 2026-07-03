import { describe, expect, it } from "vitest";

import {
  buildDualLocationOutputMatrixPromptBlock,
  DUAL_LOCATION_OUTPUT_MATRIX,
  DOCUMENTATION_PLANE_APP_DOCS,
  DOCUMENTATION_PLANE_GOVERNANCE_BRIEFINGS,
  isAppDocsMarkdownSlug,
  isGovernanceBriefingDocSlug,
} from "@/lib/documentationCorpusPlanes";
import { resolveDocPath, walkMarkdownSlugs } from "@/lib/docsNavigation";
import path from "path";

describe("documentationCorpusPlanes", () => {
  it("defines dual-location output matrix with distinct surfaces", () => {
    expect(DUAL_LOCATION_OUTPUT_MATRIX.GOVERNANCE_BRIEFINGS.surface).toBe(
      "EXTERNAL_GTM_INTELLIGENCE",
    );
    expect(DUAL_LOCATION_OUTPUT_MATRIX.APP_DOCS.surface).toBe("INTERNAL_PRODUCT_GRC_CORPUS");
    expect(DUAL_LOCATION_OUTPUT_MATRIX.GOVERNANCE_BRIEFINGS.targetLocation.databaseTable).toBe(
      "PublishedBriefing",
    );
    expect(DUAL_LOCATION_OUTPUT_MATRIX.APP_DOCS.trigger).toContain("POST /api/documentation/execute");
    expect(buildDualLocationOutputMatrixPromptBlock()).toContain("DUAL-LOCATION OUTPUT MATRIX");
  });

  it("classifies briefing slugs separately from app docs", () => {
    expect(isGovernanceBriefingDocSlug(["briefing-queue", "template"])).toBe(true);
    expect(isGovernanceBriefingDocSlug(["published-briefings", "2026-06-07-staging"])).toBe(
      true,
    );
    expect(isGovernanceBriefingDocSlug(["user-manuals", "quickstart"])).toBe(false);
    expect(isAppDocsMarkdownSlug(["technical", "architecture-and-api"])).toBe(true);
  });
});

describe("docsNavigation briefing exclusion", () => {
  const docsRoot = path.join(process.cwd(), "docs");

  it("omits briefing-queue and published-briefings from markdown walk", () => {
    const slugs = walkMarkdownSlugs(docsRoot, docsRoot);
    expect(slugs.some((slug) => slug[0] === "briefing-queue")).toBe(false);
    expect(slugs.some((slug) => slug[0] === "published-briefings")).toBe(false);
    expect(slugs.some((slug) => slug[0] === "user-manuals")).toBe(true);
  });

  it("blocks direct resolve for governance briefing paths", () => {
    expect(resolveDocPath(["published-briefings", "2026-06-07-staging-boundary-check"])).toBe(
      null,
    );
    expect(resolveDocPath(["briefing-queue", "README"])).toBe(null);
    expect(resolveDocPath(["user-manuals", "quickstart"])).not.toBe(null);
  });
});
