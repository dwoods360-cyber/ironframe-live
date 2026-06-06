import { describe, expect, it } from "vitest";
import { normalizeDocMarkdownHref, sanitizeDocSlugSegments } from "@/lib/docsLinkNormalization";

describe("sanitizeDocSlugSegments", () => {
  it("strips .md from slug segments", () => {
    expect(sanitizeDocSlugSegments(["hub", "md"])).toEqual(["hub", "md"]);
    expect(sanitizeDocSlugSegments(["hub.md"])).toEqual(["hub"]);
    expect(sanitizeDocSlugSegments(["stakeholders", "product-roadmap.md"])).toEqual([
      "stakeholders",
      "product-roadmap",
    ]);
  });

  it("drops empty segments after trim", () => {
    expect(sanitizeDocSlugSegments(["  hub.md  "])).toEqual(["hub"]);
  });
});

describe("normalizeDocMarkdownHref", () => {
  const currentSlug = ["stakeholders", "product-roadmap"];

  it("rewrites sibling relative .md links to /docs paths", () => {
    expect(normalizeDocMarkdownHref("./product-vision.md", currentSlug)).toBe(
      "/docs/stakeholders/product-vision",
    );
  });

  it("rewrites parent relative .md links", () => {
    expect(normalizeDocMarkdownHref("../GA_OPEN_ROADMAP.md", currentSlug)).toBe(
      "/docs/GA_OPEN_ROADMAP",
    );
  });

  it("preserves external URLs", () => {
    expect(normalizeDocMarkdownHref("https://example.com/doc.md", currentSlug)).toBe(
      "https://example.com/doc.md",
    );
  });

  it("strips .md from /docs/ absolute links", () => {
    expect(normalizeDocMarkdownHref("/docs/hub.md", currentSlug)).toBe("/docs/hub");
  });
});
