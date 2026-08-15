import { describe, expect, it } from "vitest";
import {
  compareHoldArchiveRows,
  isFitHeldVerifiedSuspect,
  resolveFitHeldPromoteTo,
  sortHoldArchivePortalRows,
} from "@/app/lib/ironleadsHoldArchiveSort";

function fitHeldMeta(overrides?: Record<string, unknown>) {
  return {
    namedBuyer: {
      fullName: "Jane CISO",
      email: "jane.ciso@datasure24.com",
      emailStatus: "valid",
    },
    emailGatekeeper: {
      emailGate: "VERIFIED_HELD_FIT",
      promoteTo: "jane.ciso@datasure24.com",
      promoteReady: false,
    },
    accountResearchBrief: {
      gates: { fit: { result: "UNKNOWN" } },
    },
    operatorHold: {
      classification: "enrich_later",
      reason: "Verified person email; Fit not PASS — held for Fit review",
      at: "2026-08-14T12:00:00.000Z",
    },
    ...overrides,
  };
}

describe("ironleadsHoldArchiveSort", () => {
  it("detects VERIFIED_HELD_FIT as Fit-held verified", () => {
    expect(isFitHeldVerifiedSuspect(fitHeldMeta())).toBe(true);
    expect(resolveFitHeldPromoteTo(fitHeldMeta())).toBe("jane.ciso@datasure24.com");
  });

  it("rejects intake promote-to addresses", () => {
    const meta = fitHeldMeta({
      namedBuyer: { email: "info@datasure24.com", emailStatus: "valid" },
      emailGatekeeper: {
        emailGate: "VERIFIED_HELD_FIT",
        promoteTo: "info@datasure24.com",
        promoteReady: false,
      },
    });
    expect(isFitHeldVerifiedSuspect(meta)).toBe(false);
    expect(resolveFitHeldPromoteTo(meta)).toBeNull();
  });

  it("does not flag channel-competitor holds without verified Fit block", () => {
    const meta = {
      operatorHold: {
        classification: "channel_competitor",
        reason: "Mega OEM / channel competitor",
        at: "2026-08-10T00:00:00.000Z",
      },
    };
    expect(isFitHeldVerifiedSuspect(meta)).toBe(false);
  });

  it("does not flag Fit FAIL or channel_competitor with person email as Fit-held", () => {
    expect(
      isFitHeldVerifiedSuspect({
        namedBuyer: {
          email: "rogerson@packetlabs.net",
          emailStatus: "prospeo_verified",
        },
        emailGatekeeper: {
          emailGate: "PASS",
          promoteTo: null,
          promoteReady: false,
        },
        accountResearchBrief: { gates: { fit: { result: "FAIL" } } },
        pathBVerdict: { reason: "Fit FAIL (offensive pentest)" },
        operatorHold: {
          classification: "channel_competitor",
          reason: "Channel / competitor",
          at: "2026-08-11T00:00:00.000Z",
        },
      }),
    ).toBe(false);

    expect(
      isFitHeldVerifiedSuspect({
        namedBuyer: {
          email: "jacob@fablesecurity.com",
          emailStatus: "VERIFIED",
        },
        accountResearchBrief: { gates: { fit: { result: "FAIL" } } },
        operatorHold: {
          classification: "hold",
          reason: "Operator HOLD archive after HITL review.",
          at: "2026-08-05T00:00:00.000Z",
        },
      }),
    ).toBe(false);
  });

  it("rejects promote-to on a different employer domain", () => {
    expect(
      isFitHeldVerifiedSuspect(
        fitHeldMeta({
          emailGatekeeper: {
            emailGate: "VERIFIED_HELD_FIT",
            promoteTo: "mark.bailey@wheelhouseit.com",
            promoteReady: false,
          },
          namedBuyer: {
            email: "mark.bailey@wheelhouseit.com",
            emailStatus: "verified",
          },
        }),
        "corestackit.com",
      ),
    ).toBe(false);
  });

  it("does not flag Fit PASS holds (held for employment / other reasons)", () => {
    expect(
      isFitHeldVerifiedSuspect(
        fitHeldMeta({
          accountResearchBrief: { gates: { fit: { result: "PASS" } } },
          emailGatekeeper: {
            emailGate: "HELD",
            promoteTo: "mark@corestackit.com",
            promoteReady: false,
          },
          namedBuyer: {
            email: "mark@corestackit.com",
            emailStatus: "verified",
          },
        }),
        "corestackit.com",
      ),
    ).toBe(false);
  });

  it("sorts Fit-held verified seats to the top of HOLD archive", () => {
    const fitHeld = {
      metadata: fitHeldMeta(),
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
    };
    const mega = {
      metadata: {
        operatorHold: {
          classification: "channel_competitor",
          reason: "Mega OEM",
          at: "2026-08-15T00:00:00.000Z",
        },
      },
      createdAt: new Date("2026-08-15T00:00:00.000Z"),
    };
    const enrichLater = {
      metadata: {
        operatorHold: {
          classification: "enrich_later",
          reason: "Needs buyer research",
          at: "2026-08-14T00:00:00.000Z",
        },
      },
      createdAt: new Date("2026-08-14T00:00:00.000Z"),
    };

    const rows = [mega, enrichLater, fitHeld].sort(compareHoldArchiveRows);
    expect(isFitHeldVerifiedSuspect(rows[0]!.metadata)).toBe(true);
    expect(
      (rows[1]!.metadata as { operatorHold: { classification: string } }).operatorHold
        .classification,
    ).toBe("enrich_later");
    expect(
      (rows[2]!.metadata as { operatorHold: { classification: string } }).operatorHold
        .classification,
    ).toBe("channel_competitor");
  });

  it("among Fit-held, prefers enrich_later then newer holdAt", () => {
    const older = {
      metadata: fitHeldMeta({
        operatorHold: {
          classification: "enrich_later",
          reason: "Fit held",
          at: "2026-08-01T00:00:00.000Z",
        },
        namedBuyer: {
          fullName: "Old",
          email: "old@example.com",
          emailStatus: "valid",
        },
        emailGatekeeper: {
          emailGate: "VERIFIED_HELD_FIT",
          promoteTo: "old@example.com",
          promoteReady: false,
        },
      }),
    };
    const newer = {
      metadata: fitHeldMeta({
        operatorHold: {
          classification: "enrich_later",
          reason: "Fit held",
          at: "2026-08-14T00:00:00.000Z",
        },
      }),
    };
    expect(compareHoldArchiveRows(newer, older)).toBeLessThan(0);
  });

  it("sortHoldArchivePortalRows puts Fit-held first by default", () => {
    const rows = [
      {
        id: "mega",
        company: "Mega OEM",
        fitHeldVerified: false,
        holdClassification: "channel_competitor",
        holdAt: "2026-08-15T00:00:00.000Z",
      },
      {
        id: "fit",
        company: "DataSure24",
        fitHeldVerified: true,
        holdClassification: "enrich_later",
        holdAt: "2026-08-01T00:00:00.000Z",
        fitHeldPromoteTo: "jane@datasure24.com",
      },
    ];
    expect(sortHoldArchivePortalRows(rows, "fit_held_first")[0]!.id).toBe("fit");
    expect(sortHoldArchivePortalRows(rows, "newest")[0]!.id).toBe("mega");
  });
});
