import { describe, expect, it } from "vitest";

import {
  OPERATOR_LIBRARY_SETS,
  resolveMarkdownLibraryEntry,
} from "@/app/lib/operations/operatorLibraryCatalog";

describe("operatorLibraryCatalog", () => {
  it("includes pre-outreach run order and GTM glossary", () => {
    expect(OPERATOR_LIBRARY_SETS.length).toBeGreaterThan(2);
    const entry = resolveMarkdownLibraryEntry("pre-outreach-run-order");
    expect(entry?.file).toBe("design-partner-pre-outreach-run-order.md");
    const glossary = resolveMarkdownLibraryEntry("gtm-operator-glossary");
    expect(glossary?.file).toBe("design-partner-gtm-operator-glossary.md");
    expect(OPERATOR_LIBRARY_SETS.some((s) => s.id === "glossary")).toBe(true);
  });

  it("aliases filename-style slugs to catalog slugs", () => {
    const shortlist = resolveMarkdownLibraryEntry("design-partner-icp-shortlist");
    expect(shortlist?.slug).toBe("icp-shortlist");
    expect(shortlist?.file).toBe("design-partner-icp-shortlist.md");
    expect(resolveMarkdownLibraryEntry("icp-shortlist")?.file).toBe(
      "design-partner-icp-shortlist.md",
    );
  });

  it("uses unique slugs across all items", () => {
    const slugs = OPERATOR_LIBRARY_SETS.flatMap((set) => set.items.map((i) => i.slug));
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
