import { describe, expect, it } from "vitest";
import {
  clampMaturityScore,
  GOVERNANCE_DEGRADATION_THRESHOLD,
  GOVERNANCE_NEUTRALIZE_MIN_DEGRADED,
  GOVERNANCE_NEUTRALIZE_MIN_NORMAL,
  IRONLOCK_STALE_DATA_FORENSIC_MIN_CHARS,
  resolveNeutralizeMinChars,
} from "@/app/lib/governanceMaturityState";
import {
  coerceIngestionDetailsString,
  computeDirectivityScore,
  sanitizeAttackPayload,
} from "@/app/services/governanceScoring";
import { sanitizeIngestionDetailsForUi } from "@/app/lib/riskRegistryDb";

describe("governanceMaturityState", () => {
  it("clamps score to 1-10", () => {
    expect(clampMaturityScore(0)).toBe(1);
    expect(clampMaturityScore(15)).toBe(10);
    expect(clampMaturityScore(7.2)).toBe(7.2);
  });

  it("defines degradation threshold and neutralize mins", () => {
    expect(GOVERNANCE_DEGRADATION_THRESHOLD).toBe(5);
    expect(GOVERNANCE_NEUTRALIZE_MIN_DEGRADED).toBe(75);
    expect(GOVERNANCE_NEUTRALIZE_MIN_NORMAL).toBe(50);
  });
});

describe("resolveNeutralizeMinChars (Ironlock Stale Data)", () => {
  it("raises floor to 100 when live API is down", () => {
    expect(
      resolveNeutralizeMinChars({ governanceDegradationActive: false, staleDataLiveApiDown: true }),
    ).toBe(IRONLOCK_STALE_DATA_FORENSIC_MIN_CHARS);
  });

  it("keeps 100 when governance is also degraded (>= 75 baseline)", () => {
    expect(
      resolveNeutralizeMinChars({ governanceDegradationActive: true, staleDataLiveApiDown: true }),
    ).toBe(IRONLOCK_STALE_DATA_FORENSIC_MIN_CHARS);
  });

  it("uses normal 50 when API healthy and score band normal", () => {
    expect(
      resolveNeutralizeMinChars({ governanceDegradationActive: false, staleDataLiveApiDown: false }),
    ).toBe(GOVERNANCE_NEUTRALIZE_MIN_NORMAL);
  });

  it("uses 75 when governance degraded and API healthy", () => {
    expect(
      resolveNeutralizeMinChars({ governanceDegradationActive: true, staleDataLiveApiDown: false }),
    ).toBe(GOVERNANCE_NEUTRALIZE_MIN_DEGRADED);
  });
});

describe("sanitizeAttackPayload", () => {
  it("trims strings and rejects empty", () => {
    expect(sanitizeAttackPayload("  telemetry  ")).toBe("telemetry");
    expect(sanitizeAttackPayload("   ")).toBe("NO_PAYLOAD_DETECTED");
  });

  it("stringifies objects safely (Prisma Json)", () => {
    const raw = { resolutionJustification: "Neutralized per TAS.", aleCents: "160000000000" };
    const out = sanitizeAttackPayload(raw);
    expect(out).toContain("resolutionJustification");
    expect(() => JSON.parse(out)).not.toThrow();
  });

  it("never throws on null or odd scalars", () => {
    expect(sanitizeAttackPayload(null)).toBe("NO_PAYLOAD_DETECTED");
    expect(sanitizeAttackPayload(undefined)).toBe("NO_PAYLOAD_DETECTED");
    expect(sanitizeAttackPayload(1_600_000_000)).toBe("1600000000");
  });
});

describe("sanitizeIngestionDetailsForUi", () => {
  it("stringifies object payloads for UI", () => {
    const out = sanitizeIngestionDetailsForUi({ aleCents: 1, note: "probe" });
    expect(out).toContain("aleCents");
    expect(() => JSON.parse(out!)).not.toThrow();
  });
});

describe("coerceIngestionDetailsString", () => {
  it("stringifies Prisma Json objects instead of trimming", () => {
    const raw = { resolutionJustification: "Closed per TAS.", aleCents: 1_600_000_000 };
    const details = coerceIngestionDetailsString(raw);
    expect(details).toContain("resolutionJustification");
    expect(() => JSON.parse(details!)).not.toThrow();
  });

  it("rejects nullish serialized tokens", () => {
    expect(coerceIngestionDetailsString(null)).toBeNull();
    expect(coerceIngestionDetailsString("null")).toBeNull();
    expect(coerceIngestionDetailsString("undefined")).toBeNull();
  });
});

describe("computeDirectivityScore", () => {
  it("rewards TAS deep-link citations", () => {
    const withLink = computeDirectivityScore([
      { text: "Per /constitution/tas#agent-6 we neutralized." },
      { text: "No citation here but long enough for sample." },
    ]);
    expect(withLink.cited).toBe(1);
    expect(withLink.score).toBeGreaterThan(5);
  });
});
