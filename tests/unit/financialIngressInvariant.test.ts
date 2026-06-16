/**
 * Unified financial ingress invariant — bridges:
 * - Governance Frame briefing registers (parseCentBigInt: whole-cent strings only)
 * - Sales / prospect ingress (parseDollarAleToBigIntCents: dollar UI → BigInt cents)
 *
 * Canonical targets: TENANT_INDUSTRY_BASELINE_ALE_CENTS (Medshield, Vaultbank, Gridcore).
 */
import { describe, expect, it } from "vitest";

import { TENANT_INDUSTRY_BASELINE_ALE_CENTS } from "@/app/constants/devTenantRoster";
import { parseCentBigInt, parseCentBigIntSafe } from "@/app/lib/governanceFrame/parseCentBigInt";
import {
  canonicalAleCentsForProfile,
  parseDollarAleToBigIntCents,
  parseExplicitCentAle,
  stripFinancialFormatting,
  verifyCanonicalEnterpriseBaseline,
  type SalesCanonicalProfile,
} from "@/app/lib/server/salesIntakeParse";

const CANONICAL_PROFILES: SalesCanonicalProfile[] = ["medshield", "vaultbank", "gridcore"];

const DOLLAR_INPUTS: Record<SalesCanonicalProfile, string[]> = {
  medshield: ["11,100,000.00", "$11,100,000.00", "11100000", "11100000.00"],
  vaultbank: ["5,900,000.00", "$5,900,000.00", "5900000"],
  gridcore: ["4,700,000.00", "$ 4,700,000.00", "4700000.00"],
};

describe("financial ingress invariant — canonical enterprise baselines", () => {
  it.each(CANONICAL_PROFILES)("%s dollar inputs resolve to TAS BigInt cents", (profile) => {
    const expected = TENANT_INDUSTRY_BASELINE_ALE_CENTS[profile];

    for (const input of DOLLAR_INPUTS[profile]) {
      const parsed = parseDollarAleToBigIntCents(input);
      expect(parsed.ok, `input=${input}`).toBe(true);
      if (!parsed.ok) continue;

      expect(parsed.cents).toBe(expected);
      expect(typeof parsed.cents).toBe("bigint");
      expect(verifyCanonicalEnterpriseBaseline(profile, parsed.cents)).toEqual({ ok: true });
      expect(canonicalAleCentsForProfile(profile)).toBe(expected);
    }
  });

  it.each(CANONICAL_PROFILES)(
    "%s explicit cent strings match dollar-parse output",
    (profile) => {
      const expected = TENANT_INDUSTRY_BASELINE_ALE_CENTS[profile].toString();
      const explicit = parseExplicitCentAle(expected);
      expect(explicit.ok).toBe(true);
      if (!explicit.ok) return;
      expect(explicit.cents).toBe(TENANT_INDUSTRY_BASELINE_ALE_CENTS[profile]);
    },
  );
});

describe("financial ingress invariant — Governance Frame vs sales intake boundary", () => {
  it("Governance Frame rejects fractional cent literals (briefing ledger)", () => {
    expect(() => parseCentBigInt("49.99")).toThrow(
      /Governance Frame cent register must be a whole integer/,
    );
    expect(() => parseCentBigInt("1110000000.5")).toThrow(/whole integer/);
  });

  it("sales intake accepts dollar decimals and emits whole BigInt cents (no float storage)", () => {
    const parsed = parseDollarAleToBigIntCents("11,100,000.00");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.cents).toBe(1_110_000_000n);
    expect(parseCentBigInt(parsed.cents.toString())).toBe("1110000000");
  });

  it("round-trips sales output through Governance Frame cent register parser", () => {
    for (const profile of CANONICAL_PROFILES) {
      const dollars = DOLLAR_INPUTS[profile][0];
      const sales = parseDollarAleToBigIntCents(dollars);
      expect(sales.ok).toBe(true);
      if (!sales.ok) continue;

      const register = parseCentBigInt(`"${sales.cents.toString()}"`);
      expect(register).toBe(sales.cents.toString());
      expect(BigInt(register)).toBe(TENANT_INDUSTRY_BASELINE_ALE_CENTS[profile]);
    }
  });

  it("Governance Frame safe parser never coerces illegal briefing floats into money", () => {
    expect(parseCentBigIntSafe("49.99")).toBe("0");
  });
});

describe("financial ingress invariant — formatting strip and sub-cent truncation", () => {
  it("stripFinancialFormatting removes currency noise", () => {
    expect(stripFinancialFormatting("$ 11,100,000.00")).toBe("11100000.00");
    expect(stripFinancialFormatting("  5900000  ")).toBe("5900000");
  });

  it("uses only the first two fractional digits (BigInt math, no Number.parseFloat)", () => {
    const parsed = parseDollarAleToBigIntCents("11,100,000.999");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.cents).toBe(1_110_000_099n);
  });

  it("never uses JavaScript Number for persisted cent magnitude", () => {
    const parsed = parseDollarAleToBigIntCents("11,100,000.00");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(Object.prototype.toString.call(parsed.cents)).toBe("[object BigInt]");
  });
});

describe("financial ingress invariant — sales intake rejection tokens", () => {
  it("returns native salesIntakeParse errors (not thrown exceptions)", () => {
    expect(parseDollarAleToBigIntCents("")).toEqual({
      ok: false,
      error: "ALE baseline is required.",
    });
    expect(parseDollarAleToBigIntCents("not-a-number")).toEqual({
      ok: false,
      error: "ALE baseline must be a numeric dollar amount.",
    });
    expect(parseExplicitCentAle("590000000.5")).toEqual({
      ok: false,
      error: "aleBaselineCents must be a whole number of cents.",
    });
  });

  it("blocks canonical profile drift before database write", () => {
    const drift = parseDollarAleToBigIntCents("11,100,001.00");
    expect(drift.ok).toBe(true);
    if (!drift.ok) return;

    const check = verifyCanonicalEnterpriseBaseline("medshield", drift.cents);
    expect(check.ok).toBe(false);
    if (check.ok) return;
    expect(check.error).toContain("does not match canonical medshield target");
  });
});

describe("financial ingress invariant — Prospect.reportedAle / Tenant.ale_baseline shape", () => {
  it("serializes parsed cents as decimal strings suitable for Prisma BigInt fields", () => {
    const parsed = parseDollarAleToBigIntCents("5,900,000.00");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const prismaPayload = parsed.cents.toString();
    expect(prismaPayload).toBe("590000000");
    expect(BigInt(prismaPayload)).toBe(590_000_000n);
  });
});
