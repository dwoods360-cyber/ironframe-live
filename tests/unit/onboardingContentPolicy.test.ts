import { describe, expect, it } from "vitest";

import { containsPreAuthOnboardingCopy, assertOperatorPostAuthMarkdown } from "@/lib/onboarding/onboardingContentPolicy";
import { loadOperatorQuickstartMarkdown } from "@/lib/onboarding/loadOperatorQuickstartFromRepo";

describe("onboardingContentPolicy", () => {
  it("flags pre-auth invite copy markers", () => {
    expect(containsPreAuthOnboardingCopy("Locate your welcome message in inbox")).toBe(true);
    expect(containsPreAuthOnboardingCopy("Command Post layout wireframe")).toBe(false);
  });

  it("operator quickstart markdown excludes Bucket A invite steps", () => {
    const markdown = loadOperatorQuickstartMarkdown();
    expect(markdown).toContain("Command Post layout");
    expect(markdown).toContain("Primary control areas");
    expect(containsPreAuthOnboardingCopy(markdown)).toBe(false);
    expect(() => assertOperatorPostAuthMarkdown(markdown)).not.toThrow();
    expect(markdown).not.toContain("Complete the legal agreement sign-off");
  });
});
