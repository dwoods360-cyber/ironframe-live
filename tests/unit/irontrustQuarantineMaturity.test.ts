import { describe, expect, it } from "vitest";
import {
  maturityPenaltyFromQuarantineTargeting,
  QUARANTINE_TARGET_INACTIVITY_MS,
} from "@/src/services/irontrust/mathEngine";

describe("irontrust mathEngine — quarantine targeting maturity", () => {
  const now = new Date("2026-05-15T12:00:00.000Z");

  it("applies −0.5 per strike-2 and −1.5 per hard ban for recent activity", () => {
    const r = maturityPenaltyFromQuarantineTargeting(
      [
        { offenseCount: 2, isHardBan: false, lastViolationAt: now },
        { offenseCount: 3, isHardBan: true, lastViolationAt: now },
      ],
      { now, lastChaosForensicHardeningAt: null },
    );
    expect(r.penaltyPoints).toBeCloseTo(2.0, 5);
    expect(r.contributingLedgerRows).toBe(2);
  });

  it("returns zero when rows are stale beyond inactivity window", () => {
    const stale = new Date(now.getTime() - QUARANTINE_TARGET_INACTIVITY_MS - 86_400_000);
    const r = maturityPenaltyFromQuarantineTargeting(
      [{ offenseCount: 3, isHardBan: true, lastViolationAt: stale }],
      { now, lastChaosForensicHardeningAt: null },
    );
    expect(r.penaltyPoints).toBe(0);
  });

  it("suppresses penalty after chaos forensic hardening since last adversarial activity", () => {
    const lastV = new Date("2026-05-14T12:00:00.000Z");
    const chaos = new Date("2026-05-15T08:00:00.000Z");
    const r = maturityPenaltyFromQuarantineTargeting(
      [{ offenseCount: 3, isHardBan: true, lastViolationAt: lastV }],
      { now, lastChaosForensicHardeningAt: chaos },
    );
    expect(r.penaltyPoints).toBe(0);
  });
});
