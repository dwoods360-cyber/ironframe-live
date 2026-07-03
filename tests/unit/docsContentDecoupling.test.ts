import { describe, expect, it } from "vitest";

import {
  decoupleDocsMarkdownContent,
  formatOperatorDocTitle,
  isDecoupledAppRouteHref,
  isDocsHostingUrl,
  isOperatorFacingReadingLevel,
  prepareDocContentForDisplay,
  shouldRenderDocHrefAsText,
} from "@/lib/docsContentDecoupling";

describe("docsContentDecoupling", () => {
  it("flags vercel and apex hosting URLs", () => {
    expect(isDocsHostingUrl("https://ironframe-live.vercel.app")).toBe(true);
    expect(isDocsHostingUrl("https://vaultbank.ironframegrc.com/integrity")).toBe(true);
    expect(isDocsHostingUrl("http://127.0.0.1:3000/api/board/shared-context")).toBe(true);
  });

  it("allows mailto and doc-relative paths", () => {
    expect(isDocsHostingUrl("mailto:delivery@ironframegrc.com")).toBe(false);
    expect(isDecoupledAppRouteHref("/docs/user-manuals/quickstart")).toBe(false);
    expect(isDecoupledAppRouteHref("/login")).toBe(true);
    expect(isDecoupledAppRouteHref("/dashboard/exports")).toBe(true);
  });

  it("strips hosting URLs from markdown prose", () => {
    const input =
      "Navigate to `https://ironframe-live.vercel.app` and open **Login**.";
    expect(decoupleDocsMarkdownContent(input)).toContain("your provisioned workspace URL");
    expect(decoupleDocsMarkdownContent(input)).not.toContain("vercel.app");
  });

  it("shouldRenderDocHrefAsText covers hosting URLs only", () => {
    expect(shouldRenderDocHrefAsText("https://ironframe-live.vercel.app")).toBe(true);
    expect(shouldRenderDocHrefAsText("/integrity")).toBe(false);
    expect(shouldRenderDocHrefAsText("/docs/README")).toBe(false);
  });

  it("classifies operator-facing reading levels", () => {
    expect(isOperatorFacingReadingLevel("LEVEL_1")).toBe(true);
    expect(isOperatorFacingReadingLevel("TRAINING")).toBe(true);
    expect(isOperatorFacingReadingLevel("LEVEL_2")).toBe(false);
  });

  it("strips publisher preamble from Level 1 markdown", () => {
    const source = `# Quick-Start Activation & Onboarding Guide (Level 1)

**Reading level:** 11th grade · **Milestone:** v0.1.0-ga-epic17 · **Mode:** Sales-assisted invite only

This guide walks you through activating your workspace.

---

## 1. First step
`;
    const prepared = prepareDocContentForDisplay(source, {
      readingLevel: "LEVEL_1",
      title: "Quick-Start Activation & Onboarding Guide (Level 1)",
    });
    expect(prepared).not.toContain("Reading level");
    expect(prepared).not.toContain("Milestone");
    expect(prepared).not.toContain("# Quick-Start");
    expect(prepared).toContain("This guide walks you through activating your workspace.");
    expect(prepared).toContain("## 1. First step");
    expect(formatOperatorDocTitle("Quick-Start Activation & Onboarding Guide (Level 1)")).toBe(
      "Quick-Start Activation & Onboarding Guide",
    );
    expect(
      formatOperatorDocTitle("Level 1 Training Index — Student Track (11th–12th Grade)"),
    ).toBe("Level 1 Training Index — Student Track");
  });

  it("preserves Level 2 publisher markdown unchanged aside from decoupling", () => {
    const source = "# Architecture\n\nSee https://ironframe-live.vercel.app";
    const prepared = prepareDocContentForDisplay(source, {
      readingLevel: "LEVEL_2",
      title: "Architecture",
    });
    expect(prepared).toContain("# Architecture");
    expect(prepared).toContain("your provisioned workspace URL");
    expect(prepared).not.toContain("vercel.app");
  });
});
