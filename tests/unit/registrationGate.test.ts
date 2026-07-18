import { describe, expect, it } from "vitest";
import {
  IRONFRAME_PUBLIC_REGISTRATION_ENABLED,
  shouldBlockProspectIngress,
  SALES_CONTACT_PATH,
} from "@/config/registration";
import {
  parseDollarAleToBigIntCents,
  parseExplicitCentAle,
  verifyCanonicalEnterpriseBaseline,
} from "@/app/lib/server/salesIntakeParse";
import { DEMO_ALE_BASELINE_CENTS } from "@/app/lib/demo/demoModeConstants";

describe("config/registration", () => {
  it("hardcodes public registration off", () => {
    expect(IRONFRAME_PUBLIC_REGISTRATION_ENABLED).toBe(false);
  });

  it("blocks self-serve setup when invite-only; allows public demo sandbox", () => {
    expect(shouldBlockProspectIngress("/register/setup")).toBe(true);
    expect(shouldBlockProspectIngress("/api/register/public-intake")).toBe(true);
    expect(shouldBlockProspectIngress("/register/demo")).toBe(false);
    expect(shouldBlockProspectIngress("/demo/dashboard")).toBe(false);
    expect(shouldBlockProspectIngress(SALES_CONTACT_PATH)).toBe(false);
    expect(shouldBlockProspectIngress("/login")).toBe(false);
  });
});

describe("salesIntakeParse", () => {
  it("parses formatted dollars into BigInt cents", () => {
    const parsed = parseDollarAleToBigIntCents("$11,100,000.00");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.cents).toBe(1_110_000_000n);
    }
  });

  it("accepts explicit cent strings", () => {
    const parsed = parseExplicitCentAle("590000000");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.cents).toBe(590_000_000n);
    }
  });

  it("verifies canonical medshield baseline", () => {
    const cents = DEMO_ALE_BASELINE_CENTS.medshield;
    expect(verifyCanonicalEnterpriseBaseline("medshield", cents)).toEqual({ ok: true });
    expect(verifyCanonicalEnterpriseBaseline("medshield", cents - 1n).ok).toBe(false);
  });
});
