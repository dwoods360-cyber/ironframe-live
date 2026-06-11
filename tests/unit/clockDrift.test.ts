import { describe, expect, it } from "vitest";
import {
  CLOCK_DRIFT_DISMISS_SESSION_KEY,
  CLOCK_DRIFT_WARN_THRESHOLD_MS,
} from "@/app/config/clockDrift";

describe("clockDrift config", () => {
  it("uses 2000ms warn tolerance for cloud latency buffer", () => {
    expect(CLOCK_DRIFT_WARN_THRESHOLD_MS).toBe(2000);
  });

  it("exposes session dismiss storage key", () => {
    expect(CLOCK_DRIFT_DISMISS_SESSION_KEY).toMatch(/^ironframe:/);
  });
});
