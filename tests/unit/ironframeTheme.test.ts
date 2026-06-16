import { describe, expect, it } from "vitest";
import {
  ironframeThemeIdFromNext,
  nextThemeFromIronframeId,
  resolveBodyThemeAttributes,
} from "@/app/lib/ironframeTheme";

describe("ironframeTheme", () => {
  it("maps next-themes values to UI theme ids", () => {
    expect(ironframeThemeIdFromNext("system")).toBe("standard-system");
    expect(ironframeThemeIdFromNext("light")).toBe("standard-system");
    expect(ironframeThemeIdFromNext("executive-light")).toBe("executive-light");
    expect(ironframeThemeIdFromNext("cyber-command-dark")).toBe("cyber-command-dark");
  });

  it("maps UI theme ids to next-themes storage values", () => {
    expect(nextThemeFromIronframeId("standard-system")).toBe("system");
    expect(nextThemeFromIronframeId("executive-light")).toBe("executive-light");
    expect(nextThemeFromIronframeId("cyber-command-dark")).toBe("cyber-command-dark");
  });

  it("resolves static body data attributes for layout palettes", () => {
    expect(resolveBodyThemeAttributes("executive-light")).toEqual({
      "data-ironframe-theme": "executive-light",
      "data-ironframe-palette": "executive-light",
    });
    expect(resolveBodyThemeAttributes("cyber-command-dark")).toEqual({
      "data-ironframe-theme": "cyber-command-dark",
      "data-ironframe-palette": "cyber-command-dark",
    });
    expect(resolveBodyThemeAttributes("system")).toEqual({
      "data-ironframe-theme": "system",
      "data-ironframe-palette": "standard-system",
    });
  });
});
