import { beforeEach, describe, expect, it, vi } from "vitest";

import { IRONLOCK_REJECTION_FIDELITY_MESSAGE } from "@/app/utils/ironlockRejectionMessages";

const hoisted = vi.hoisted(() => ({
  readGovernanceMaturityStateSync: vi.fn(),
  getRequiredForensicAttestationMin: vi.fn(),
}));

vi.mock("@/app/lib/governanceMaturityState", () => ({
  readGovernanceMaturityStateSync: hoisted.readGovernanceMaturityStateSync,
}));

vi.mock("@/app/utils/tasFingerprint", () => ({
  getRequiredForensicAttestationMin: hoisted.getRequiredForensicAttestationMin,
}));

describe("ironlock validateJustification", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    hoisted.readGovernanceMaturityStateSync.mockReturnValue({
      current: {
        apiOutagePenaltyActive: false,
        neutralizeMinChars: 50,
      },
      trend: [],
    });
    hoisted.getRequiredForensicAttestationMin.mockReturnValue(50);
  });

  it("returns 422 with Ironlock fidelity message when API degraded and length below required", async () => {
    hoisted.getRequiredForensicAttestationMin.mockReturnValue(100);
    hoisted.readGovernanceMaturityStateSync.mockReturnValue({
      current: { apiOutagePenaltyActive: true, neutralizeMinChars: 100 },
      trend: [],
    });

    const { validateJustification } = await import("@/src/services/ironlock/validationRules");
    const pad = "x".repeat(60);
    const r = validateJustification(pad);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.httpStatus).toBe(422);
      expect(r.error).toBe(IRONLOCK_REJECTION_FIDELITY_MESSAGE);
    }
  });

  it("returns 403 when not degraded and below min", async () => {
    hoisted.getRequiredForensicAttestationMin.mockReturnValue(50);
    const { validateJustification } = await import("@/src/services/ironlock/validationRules");
    const r = validateJustification("short");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.httpStatus).toBe(403);
      expect(r.error).toContain("50");
    }
  });

  it("accepts sufficient high-quality justification when not degraded", async () => {
    hoisted.getRequiredForensicAttestationMin.mockReturnValue(50);
    const { validateJustification } = await import("@/src/services/ironlock/validationRules");
    const text =
      "I reviewed Irongate telemetry, reconciled tenant audit braid, and confirm closure aligns with GRC posture here.";
    const r = validateJustification(text);
    expect(r.ok).toBe(true);
  });
});
