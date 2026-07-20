import { describe, expect, it } from "vitest";

import {
  parseGovernanceMarkdown,
  spansToPlainText,
} from "../../scripts/governance-frame/google-docs/markdown-parser";
import { buildDocsPayload } from "../../scripts/governance-frame/google-docs/docs-formatting";

describe("governanceFrame google-docs markdown parser", () => {
  it("strips YAML frontmatter and treats first H1/H2 as title/subtitle", () => {
    const md = `---
researchId: "GF-2026-001"
title: "From Frontmatter"
subtitle: "Sub"
---

# Body Title

## Body Subtitle

## Research Integrity Statement

Paragraph with **bold** and *italic*.
`;
    const parsed = parseGovernanceMarkdown(md, "manuscript.md");
    expect(parsed.frontmatter.researchId).toBe("GF-2026-001");
    expect(parsed.blocks[0]?.type).toBe("title");
    expect(spansToPlainText(parsed.blocks[0]!.spans as never)).toBe("Body Title");
    expect(parsed.blocks[1]?.type).toBe("subtitle");
    expect(parsed.blocks.some((b) => b.type === "heading")).toBe(true);
    const para = parsed.blocks.find((b) => b.type === "paragraph");
    expect(para?.type).toBe("paragraph");
    if (para?.type === "paragraph") {
      expect(para.spans.some((s) => s.bold && s.text === "bold")).toBe(true);
      expect(para.spans.some((s) => s.italic && s.text === "italic")).toBe(true);
    }
  });

  it("parses lists, blockquotes, tables, and page breaks", () => {
    const md = `# Title

> Quoted line

- one
- two

1. first
2. second

| A | B |
| --- | --- |
| 1 | 2 |

<!-- pagebreak -->

## After break
`;
    const parsed = parseGovernanceMarkdown(md, "sample.md");
    expect(parsed.blocks.some((b) => b.type === "blockquote")).toBe(true);
    expect(parsed.blocks.some((b) => b.type === "unordered_list")).toBe(true);
    expect(parsed.blocks.some((b) => b.type === "ordered_list")).toBe(true);
    const table = parsed.blocks.find((b) => b.type === "table");
    expect(table?.type).toBe("table");
    if (table?.type === "table") {
      expect(table.headers).toEqual(["A", "B"]);
      expect(table.rows[0]).toEqual(["1", "2"]);
    }
    expect(parsed.blocks.some((b) => b.type === "page_break")).toBe(true);
  });

  it("fails hard on fenced code blocks that would drop content", () => {
    const md = `# Title

\`\`\`ts
const x = 1;
\`\`\`
`;
    expect(() => parseGovernanceMarkdown(md, "code.md")).toThrow(/content loss/i);
  });

  it("builds manuscript cover with separate metadata and contiguous TOC", () => {
    const md = `---
researchId: "GF-2026-001"
title: "The Evolution of GRC"
subtitle: "Historical Analysis"
version: "1.0-draft"
status: "EDITORIAL_DRAFT"
classification: "Institutional Governance"
publisher: "Governance Frame Research"
canonicalRepositoryPath: "docs/governance-frame/research-papers/GF-2026-001-evolution-of-grc/manuscript.md"
---

# The Evolution of GRC

## Historical Analysis

**Version:** 1.0 Draft  
**Status:** Editorial Draft  
**Classification:** Institutional Governance

## Research Integrity Statement

Prose stays normal.

## Table of Contents

1. Introduction
2. Emergence
9. Appendices

# 1. Introduction

Body.

# 2. Emergence

Draft pending.
`;
    const parsed = parseGovernanceMarkdown(md, "manuscript.md");
    const payload = buildDocsPayload(parsed, {
      includeCoverFromFrontmatter: true,
      forcePageBreaksForManuscript: true,
    });
    expect(payload.text).toContain("Version: 1.0 Draft\n");
    expect(payload.text).toContain("Status: Editorial Draft\n");
    expect(payload.text).toContain("Classification: Institutional Governance\n");
    expect(payload.text).not.toMatch(
      /Version: 1\.0 Draft Status: Editorial Draft Classification:/,
    );
    expect(payload.text).toContain("Table of Contents\n");
    expect(payload.text).toContain("Table of Contents\n1. Introduction\n2. Emergence\n");
    expect(payload.text).toMatch(/Appendices\n/);
    // Cover → TOC, TOC → body only (no blank interstitial page machinery).
    expect(payload.pageBreaks).toHaveLength(2);
    expect(payload.paragraphStyles.some((s) => s.namedStyleType === "TITLE")).toBe(
      true,
    );
    expect(payload.paragraphStyles.some((s) => s.namedStyleType === "HEADING_1")).toBe(
      true,
    );
    expect(payload.paragraphStyles.some((s) => s.namedStyleType === "NORMAL_TEXT")).toBe(
      true,
    );
  });

  it("keeps Version/Status/Classification as separate paragraphs", () => {
    const md = `# Title

**Version:** 1.0 Draft  
**Status:** Editorial Draft  
**Classification:** Institutional Governance

Body.
`;
    const parsed = parseGovernanceMarkdown(md, "meta.md");
    const fields = parsed.blocks.filter((b) => b.type === "paragraph");
    const texts = fields.map((b) =>
      b.type === "paragraph" ? spansToPlainText(b.spans) : "",
    );
    expect(texts.some((t) => /^Version:/i.test(t) && !/Status:/i.test(t))).toBe(true);
    expect(texts.some((t) => /^Status:/i.test(t))).toBe(true);
    expect(texts.some((t) => /^Classification:/i.test(t))).toBe(true);
  });
});

