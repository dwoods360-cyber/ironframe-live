import { describe, it, expect } from "vitest";
import {
  telemetryFailureHealthBarPercent,
  ironwatchTelemetryThreadId,
} from "@/src/services/irontech/healthPostureMonitor";
import {
  healthBarRequiresTriage,
  TAS_HEALTH_TRIAGE_THRESHOLD_PERCENT,
} from "@/app/config/tasHealthTriage";

describe("healthPostureMonitor telemetry mapping", () => {
  it("maps consecutive failures below 50% at stale threshold", () => {
    const bar = telemetryFailureHealthBarPercent(16, 16);
    expect(bar).toBeLessThan(TAS_HEALTH_TRIAGE_THRESHOLD_PERCENT);
    expect(healthBarRequiresTriage(bar)).toBe(true);
  });

  it("stays at baseline with zero failures", () => {
    expect(telemetryFailureHealthBarPercent(0, 16)).toBe(50);
    expect(healthBarRequiresTriage(50)).toBe(false);
  });

  it("builds stable ironwatch thread ids", () => {
    expect(ironwatchTelemetryThreadId("abc-tenant")).toBe("ironwatch-telemetry-abc-tenant");
  });
});
