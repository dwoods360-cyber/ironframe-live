import { describe, expect, it } from "vitest";
import {
  isDashboardHomePath,
  resolveSettingsConfigHref,
} from "@/app/utils/simulationNavFocus";

describe("simulationNavFocus", () => {
  it("treats / and /dashboard as Command Center home", () => {
    expect(isDashboardHomePath("/")).toBe(true);
    expect(isDashboardHomePath("/dashboard")).toBe(true);
    expect(isDashboardHomePath("/integrity")).toBe(false);
    expect(isDashboardHomePath("/settings")).toBe(false);
  });

  it("resolves tenant workspace config prefix — never flat /settings", () => {
    expect(resolveSettingsConfigHref(null)).toBe("/config");
    expect(resolveSettingsConfigHref("medshield")).toBe("/medshield/config");
    expect(resolveSettingsConfigHref("vaultbank")).toBe("/vaultbank/config");
  });
});
