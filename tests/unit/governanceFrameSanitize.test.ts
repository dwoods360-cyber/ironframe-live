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

  it("accepts editorial triad heading synonyms", () => {
    const variants: Array<{ ii: string; iii: string }> = [
      { ii: "Quantitative Context", iii: "What Modern GRC Must Enforce" },
      { ii: "Economic Context", iii: "Architectural Implications" },
      { ii: "Quantitative Impact", iii: "Control-System Requirements" },
      {
        ii: "Calculated Quantitative Impact",
        iii: "Machine-Rule Technical Translation",
      },
    ];

    for (const { ii, iii } of variants) {
      const body = `## I. Exposure Vector

## II. ${ii}

## III. ${iii}

## IV. Verification Protocol

## V. Sources & Citations
`;
      const ids = new Set(parseBriefingSections(body).map((s) => s.id));
      expect(ids.has("exposure"), `I missing for ${ii}/${iii}`).toBe(true);
      expect(ids.has("impact"), `II missing for ${ii}`).toBe(true);
      expect(ids.has("machine-rule"), `III missing for ${iii}`).toBe(true);
      expect(ids.has("verification")).toBe(true);
      expect(ids.has("citations")).toBe(true);
    }
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
