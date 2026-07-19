import { describe, expect, it } from "vitest";

import { governanceFrameCharterRedirectPath } from "@/config/governanceFramePublic";

describe("governanceFrameCharterRedirectPath", () => {
  it("maps bare .md charter URLs to pretty research paths", () => {
    expect(governanceFrameCharterRedirectPath("/operating-outline.md")).toBe(
      "/operating-outline",
    );
    expect(governanceFrameCharterRedirectPath("/what-governance-frame-is.md")).toBe(
      "/what-governance-frame-is",
    );
    expect(governanceFrameCharterRedirectPath("/editorial-standards.md")).toBe(
      "/editorial-standards",
    );
  });

  it("maps docs/charter filesystem-style paths", () => {
    expect(
      governanceFrameCharterRedirectPath(
        "/docs/governance-frame/charter/operating-outline.md",
      ),
    ).toBe("/operating-outline");
    expect(
      governanceFrameCharterRedirectPath("/governance-frame/charter/what-governance-frame-is"),
    ).toBe("/what-governance-frame-is");
  });

  it("does not redirect already-pretty paths", () => {
    expect(governanceFrameCharterRedirectPath("/operating-outline")).toBeNull();
    expect(governanceFrameCharterRedirectPath("/what-governance-frame-is")).toBeNull();
    expect(governanceFrameCharterRedirectPath("/briefings/some-slug")).toBeNull();
  });
});
