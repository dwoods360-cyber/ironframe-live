import { describe, expect, it } from "vitest";

import { containsPreAuthOnboardingCopy } from "@/lib/onboarding/onboardingContentPolicy";
import { loadOperatorQuickstartMarkdown } from "@/lib/onboarding/loadOperatorQuickstartFromRepo";

describe("onboardingContentPolicy", () => {
  it("flags pre-auth invite copy markers", () => {
    expect(containsPreAuthOnboardingCopy("Locate your welcome message in inbox")).toBe(true);
    expect(containsPreAuthOnboardingCopy("Command Post Dashboard wireframe")).toBe(false);
  });

  it("operator quickstart markdown includes activation and orientation sections", () => {
    const markdown = loadOperatorQuickstartMarkdown();
    expect(markdown).toContain("Command Post Dashboard");
    expect(markdown).toContain("Primary control areas");
    expect(markdown).toContain("Billing hold");
    expect(markdown).toContain("Receiving and processing your invitation");
  });
});
