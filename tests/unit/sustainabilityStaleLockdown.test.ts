import { describe, expect, it } from "vitest";
import {
  computeSustainabilityStaleLockdown,
  SUSTAINABILITY_STALE_LOCKDOWN_THRESHOLD_HOURS,
} from "@/app/config/sustainabilityStaleLockdown";

describe("computeSustainabilityStaleLockdown", () => {
  const t0 = new Date("2026-05-15T12:00:00.000Z").getTime();

  it("blocks mutations after 24h degraded with no waiver", () => {
    const since = new Date(t0 - (SUSTAINABILITY_STALE_LOCKDOWN_THRESHOLD_HOURS + 1) * 3_600_000);
    const r = computeSustainabilityStaleLockdown(
      {
        sustainabilityLiveApiDegraded: true,
        sustainabilityApiDegradedSince: since,
        sustainabilityStaleLockdownWaived: false,
      },
      t0,
    );
    expect(r.staleDataLockdownWindow).toBe(true);
    expect(r.blockingMutations).toBe(true);
  });

  it("does not block when waived", () => {
    const since = new Date(t0 - 30 * 3_600_000);
    const r = computeSustainabilityStaleLockdown(
      {
        sustainabilityLiveApiDegraded: true,
        sustainabilityApiDegradedSince: since,
        sustainabilityStaleLockdownWaived: true,
      },
      t0,
    );
    expect(r.staleDataLockdownWindow).toBe(true);
    expect(r.blockingMutations).toBe(false);
  });

  it("does not enter lockdown window before 24h", () => {
    const since = new Date(t0 - 12 * 3_600_000);
    const r = computeSustainabilityStaleLockdown(
      {
        sustainabilityLiveApiDegraded: true,
        sustainabilityApiDegradedSince: since,
        sustainabilityStaleLockdownWaived: false,
      },
      t0,
    );
    expect(r.staleDataLockdownWindow).toBe(false);
    expect(r.blockingMutations).toBe(false);
  });
});
