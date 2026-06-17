import { describe, expect, it } from "vitest";

import {
  escapeXml,
  formatRssItemTitle,
  resolvePublicationDate,
  resolveSummary,
  serializeRssXml,
  toRfc822Date,
  validateCentIntegrity,
} from "../../scripts/compile-rss";

describe("compile-rss", () => {
  it("formats RSS item title with issue number prefix", () => {
    expect(formatRssItemTitle("SEC Item 1.05 Compliance Update", "42")).toBe(
      "[Issue #42] SEC Item 1.05 Compliance Update",
    );
    expect(formatRssItemTitle("Untitled Brief", undefined)).toBe("Untitled Brief");
  });

  it("converts ISO dates to RFC 822", () => {
    expect(toRfc822Date("2026-06-07T10:00:00.000Z")).toBe("Sun, 07 Jun 2026 10:00:00 GMT");
  });

  it("resolves summary from frontmatter or executive blockquote", () => {
    const body = `> Executive summary: Board-level delta on staging boundaries.

### I. Exposure Vector

Detail text.`;

    expect(resolveSummary(body, { summary: "Custom summary" })).toBe("Custom summary");
    expect(resolveSummary(body, {})).toContain("Board-level delta");
  });

  it("serializes channel branding and item links", () => {
    const xml = serializeRssXml([
      {
        slug: "alpha-brief",
        title: "[Issue #7] Alpha Brief",
        link: "https://brief.ironframegrc.com/governance-frame/alpha-brief",
        pubDateRfc822: "Sun, 07 Jun 2026 10:00:00 GMT",
        description: "Summary text",
        sortKey: 1,
      },
    ]);

    expect(xml).toContain("<title>The Governance Frame</title>");
    expect(xml).toContain("<link>https://brief.ironframegrc.com</link>");
    expect(xml).toContain("Immutable Executive GRC Intelligence from the Ironframe System.");
    expect(xml).toContain("https://brief.ironframegrc.com/governance-frame/alpha-brief");
    expect(escapeXml("<script>")).toBe("&lt;script&gt;");
  });

  it("rejects floating-point cent registers", () => {
    expect(() =>
      validateCentIntegrity({ ale_delta_cents: "49.99" }, ""),
    ).toThrow(/whole integer/);
  });

  it("prefers explicit date frontmatter for publication ordering", () => {
    const { iso } = resolvePublicationDate(
      { date: "2026-06-07T10:00:00.000Z", publishedAt: "2025-01-01T00:00:00.000Z" },
      0,
    );
    expect(iso).toBe("2026-06-07T10:00:00.000Z");
  });
});
