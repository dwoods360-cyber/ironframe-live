import { describe, expect, it } from "vitest";
import {
  LEFT_PANEL_FEATURE_COUNT,
  LEFT_PANEL_FEATURE_INDICES,
  LP_FEATURE,
  isValidLeftPanelFeatureIndex,
} from "@/app/config/leftPanelFeatureIndex";

describe("leftPanelFeatureIndex", () => {
  it("defines sequential indices 0 through 32 without gaps", () => {
    expect(LEFT_PANEL_FEATURE_COUNT).toBe(33);
    expect(LEFT_PANEL_FEATURE_INDICES).toEqual(
      Array.from({ length: 33 }, (_, i) => i),
    );
    const values = Object.values(LP_FEATURE).sort((a, b) => a - b);
    expect(values).toEqual(LEFT_PANEL_FEATURE_INDICES);
  });

  it("validates canonical index range", () => {
    expect(isValidLeftPanelFeatureIndex(0)).toBe(true);
    expect(isValidLeftPanelFeatureIndex(32)).toBe(true);
    expect(isValidLeftPanelFeatureIndex(-1)).toBe(false);
    expect(isValidLeftPanelFeatureIndex(33)).toBe(false);
    expect(isValidLeftPanelFeatureIndex(1.5)).toBe(false);
  });
});
