import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { stageBriefingQueueDraftCore } from "@/app/lib/server/stageBriefingQueueDraftCore";

describe("stageBriefingQueueDraftCore", () => {
  it("stages a valid market draft into a temp docs root when DOCS override is used via cwd docs", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "briefing-stage-"));
    const docs = path.join(root, "docs");
    fs.mkdirSync(path.join(docs, "briefing-queue"), { recursive: true });
    fs.writeFileSync(path.join(docs, "TAS.md"), "# TAS\n", "utf8");

    const prev = process.cwd();
    process.chdir(root);
    try {
      const markdown = `---
title: "Test Market Draft"
date: "2026-07-14T00:00:00.000Z"
status: "QUARANTINED_DRAFT"
tenantId: "00000000-0000-0000-0000-000000000000"
tenantSlug: "ironframe-sandbox"
activeExposureCents: "0"
---

### I. Exposure Vector
Public market framing.

### II. Calculated Quantitative Impact
- Baseline: 100 cents ($1.00 USD)

### III. Machine-Rule Technical Translation
Enforce BigInt cents.

### V. Sources & Citations
- **[1] Example** — https://example.com · retrieved 2026-07-14
`;
      const result = stageBriefingQueueDraftCore({
        filename: "2026-07-14-draft-market-grc-test.md",
        markdown,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(fs.existsSync(result.absolutePath)).toBe(true);
        expect(fs.readFileSync(result.absolutePath, "utf8")).toContain("### V. Sources & Citations");
      }
    } finally {
      process.chdir(prev);
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects non-draft filenames", () => {
    const result = stageBriefingQueueDraftCore({
      filename: "README.md",
      markdown: "### I. Exposure Vector\n\n### II. Calculated Quantitative Impact\n\n### III. Machine-Rule Technical Translation\n\n### V. Sources & Citations\n",
    });
    expect(result.ok).toBe(false);
  });
});
