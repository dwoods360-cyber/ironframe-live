import { describe, expect, it } from "vitest";

import {
  compileGovernanceFrameEmail,
  formatUsdLocalizedFromCents,
  GOVERNANCE_FRAME_FEED_ORIGIN,
  IRONFRAME_LOGO_PUBLIC_URL,
} from "@/lib/agents/ironcast/templates/governanceFrameEmail";
import {
  assertNewsletterPresentationSafety,
  compileGovernanceFrameNewsletterBySlug,
  runGovernanceFramePublicationCompile,
} from "@/lib/agents/ironcast/workers/compileNewsletter";

describe("Governance Frame email compiler", () => {
  it("formats USD from BigInt cents without floating-point math", () => {
    expect(formatUsdLocalizedFromCents("499900")).toBe("$4,999.00");
    expect(formatUsdLocalizedFromCents("0")).toBe("$0.00");
  });

  it("compiles alabaster editorial HTML with three-part frame and CTA", () => {
    const markdown = `---
title: Test Briefing
publishedAt: 2026-06-07T10:00:00.000Z
---

### I. Exposure Vector

Exposure narrative for inbox scanning.

### II. Calculated Quantitative Impact

- **Reported ALE delta (¢):** "499900"

### III. Machine-Rule Technical Translation

\`\`\`typescript
const LEDGER = "published-briefings";
\`\`\`
`;

    const compiled = compileGovernanceFrameEmail({
      slug: "test-briefing",
      title: "Test Briefing",
      publishedAt: "2026-06-07T10:00:00.000Z",
      markdown,
    });

    expect(compiled.subject).toContain("Test Briefing");
    expect(compiled.feedUrl).toBe(
      `${GOVERNANCE_FRAME_FEED_ORIGIN}/briefings/test-briefing`,
    );
    expect(compiled.html).toContain("IRONFRAME SYSTEM INTELLIGENCE");
    expect(compiled.html).toContain(IRONFRAME_LOGO_PUBLIC_URL);
    expect(compiled.html).toContain('alt="Ironframe"');
    expect(compiled.html).toContain("The Governance Frame");
    expect(compiled.html).toContain("I. Exposure Vector");
    expect(compiled.html).toContain("499900");
    expect(compiled.html).toContain("$4,999.00");
    expect(compiled.html).toContain("Courier New");
    expect(compiled.html).toContain("#ffffff");
    expect(compiled.html).toContain(compiled.feedUrl);

    assertNewsletterPresentationSafety(compiled.html);
    expect(compiled.html).not.toMatch(/<script/i);
  });

  it("runs publication compile loop against published ledger", () => {
    const result = runGovernanceFramePublicationCompile();
    expect(result.compiled.length).toBeGreaterThan(0);
    expect(result.compiled[0]?.html).toContain("The Governance Frame");

    const hit = compileGovernanceFrameNewsletterBySlug("2026-01-15-market-grc-2000-2008");
    expect(hit?.slug).toBe("2026-01-15-market-grc-2000-2008");
    expect(hit?.html).toMatch(/Sarbanes-Oxley|Checklist Compliance/i);
    assertNewsletterPresentationSafety(hit?.html ?? "");
  });
});
