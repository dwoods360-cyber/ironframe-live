import { describe, expect, it } from "vitest";

import {
  normalizeGetStartedInlineDocHref,
  shouldInterceptGetStartedInlineDocLink,
} from "@/app/lib/getStartedInlineDocLinks";

describe("getStartedInlineDocLinks", () => {
  it("intercepts in-app documentation routes for inline reader navigation", () => {
    expect(shouldInterceptGetStartedInlineDocLink("/docs/user-manuals/glossary")).toBe(true);
    expect(shouldInterceptGetStartedInlineDocLink("/docs/end-users/onboarding")).toBe(true);
    expect(shouldInterceptGetStartedInlineDocLink("/integrity")).toBe(false);
    expect(shouldInterceptGetStartedInlineDocLink("/dashboard/exports")).toBe(false);
    expect(shouldInterceptGetStartedInlineDocLink("#export-audit-deliverables")).toBe(false);
  });

  it("normalizes documentation href casing for reader fetches", () => {
    expect(normalizeGetStartedInlineDocHref("/docs/training/LEVEL1-STUDENT-INDEX")).toBe(
      "/docs/training/level1-student-index",
    );
    expect(normalizeGetStartedInlineDocHref("/docs/user-manuals/user-guide#export-audit-deliverables")).toBe(
      "/docs/user-manuals/user-guide#export-audit-deliverables",
    );
  });
});
