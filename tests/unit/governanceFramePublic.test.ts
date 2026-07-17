import { describe, expect, it } from "vitest";

import {
  GOVERNANCE_FRAME_PUBLIC_ORIGIN,
  governanceFrameBriefingPath,
  governanceFrameBriefingUrl,
  isGovernanceFramePublicHost,
  isGovernanceFramePublicPath,
  isGovernanceFrameResearchInternalPath,
} from "../../config/governanceFramePublic";

describe("governanceFramePublic", () => {
  it("defaults the public origin to research.ironframegrc.com", () => {
    expect(GOVERNANCE_FRAME_PUBLIC_ORIGIN).toBe("https://research.ironframegrc.com");
  });

  it("recognizes research and brief public hosts", () => {
    expect(isGovernanceFramePublicHost("research.ironframegrc.com")).toBe(true);
    expect(isGovernanceFramePublicHost("brief.ironframegrc.com:443")).toBe(true);
    expect(isGovernanceFramePublicHost("vaultbank.ironframegrc.com")).toBe(false);
  });

  it("builds briefing URLs on the research publication", () => {
    expect(governanceFrameBriefingPath("2026-01-15-market-grc-2000-2008")).toBe(
      "/briefings/2026-01-15-market-grc-2000-2008",
    );
    expect(governanceFrameBriefingUrl("alpha")).toBe(
      "https://research.ironframegrc.com/briefings/alpha",
    );
  });

  it("classifies research internal and pretty public paths", () => {
    expect(isGovernanceFrameResearchInternalPath("/gf-research")).toBe(true);
    expect(isGovernanceFrameResearchInternalPath("/gf-research/about")).toBe(true);
    expect(isGovernanceFramePublicPath("/briefings/demo")).toBe(true);
    expect(isGovernanceFramePublicPath("/governance-frame/demo")).toBe(true);
    expect(isGovernanceFramePublicPath("/dashboard")).toBe(false);
  });
});
