import { describe, expect, it } from "vitest";

import {
  parseBriefingSections,
  parseImpactMetrics,
} from "@/app/lib/governanceFrame/parseBriefingSections";
import { parseCentBigInt, parseCentBigIntSafe } from "@/app/lib/governanceFrame/parseCentBigInt";
import {
  DISALLOWED_MARKDOWN_ELEMENTS,
  sanitizeMarkdownUrl,
  stripDangerousMarkdown,
} from "@/app/lib/governanceFrame/sanitizeMarkdown";

describe("Governance Frame cent registers", () => {
  it("coerces whole-cent values to stringified BigInt", () => {
    expect(parseCentBigInt('"499900"')).toBe("499900");
    expect(parseCentBigIntSafe("0")).toBe("0");
  });

  it("rejects floating-point cent literals", () => {
    expect(() => parseCentBigInt("49.99")).toThrow(/whole integer/);
  });
});

describe("Governance Frame section parser", () => {
  it("splits impact metrics into BigInt cent rows", () => {
    const body = `### II. Calculated Quantitative Impact

- **Reported ALE delta (¢):** "0"
- **Provisioning tunnel test exposure (¢):** "499900"`;

    const sections = parseBriefingSections(body);
    expect(sections.find((s) => s.id === "impact")).toBeTruthy();

    const rows = parseImpactMetrics(body);
    expect(rows[0]?.cents).toBe("0");
    expect(rows[1]?.cents).toBe("499900");
  });
});

describe("Governance Frame sanitizeMarkdown", () => {
  it("strips script tags and javascript URIs", () => {
    const raw = [
      "# Title",
      "",
      '<script>alert("xss")</script>',
      "[evil](javascript:alert(1))",
      '<img src=x onerror="alert(1)">',
    ].join("\n");

    const safe = stripDangerousMarkdown(raw);
    expect(safe).not.toMatch(/<script/i);
    expect(safe).not.toMatch(/javascript:/i);
    expect(safe).not.toMatch(/onerror=/i);
  });

  it("blocks dangerous URL schemes", () => {
    expect(sanitizeMarkdownUrl("javascript:alert(1)")).toBe("");
    expect(sanitizeMarkdownUrl("https://ironframegrc.com")).toBe("https://ironframegrc.com");
  });

  it("disallows executable HTML elements in react-markdown", () => {
    expect(DISALLOWED_MARKDOWN_ELEMENTS).toContain("script");
    expect(DISALLOWED_MARKDOWN_ELEMENTS).toContain("iframe");
  });
});
