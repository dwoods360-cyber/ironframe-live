import { describe, expect, it } from "vitest";
import {
  getStagedNavSurface,
  isStagedNavBlockedForRole,
  normalizeDashboardNavHref,
} from "@/app/config/stagedNavSurfaces";

describe("stagedNavSurfaces", () => {
  it("normalizes tenant-prefixed hrefs", () => {
    expect(normalizeDashboardNavHref("/medshield/vendors/supply-chain")).toBe(
      "/vendors/supply-chain",
    );
    expect(normalizeDashboardNavHref("/reports/dora-eu-resilience")).toBe(
      "/reports/dora-eu-resilience",
    );
  });

  it("resolves DORA preview surface", () => {
    expect(getStagedNavSurface("/reports/dora-eu-resilience")?.badge).toBe("PREVIEW");
    expect(getStagedNavSurface("/vendors/supply-chain")?.badge).toBe("PILOT");
    expect(getStagedNavSurface("/vendors")?.badge).toBe("PILOT");
  });

  it("resolves vendor child routes via vendors pilot surface", () => {
    expect(getStagedNavSurface("/medshield/vendors/reports")?.badge).toBe("PILOT");
  });

  it("blocks GRC_MANAGER from staged stubs", () => {
    expect(isStagedNavBlockedForRole("/reports/dora-eu-resilience", "GRC_MANAGER")).toBe(true);
    expect(isStagedNavBlockedForRole("/vendors/supply-chain", "GRC_MANAGER")).toBe(false);
    expect(isStagedNavBlockedForRole("/reports/hipaa-audit", "GRC_MANAGER")).toBe(false);
  });
});
