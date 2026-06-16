import { TENANT_INDUSTRY_BASELINE_ALE_CENTS } from "@/app/constants/devTenantRoster";
import type { TenantKey } from "@/app/utils/tenantIsolation";

export const SALES_CANONICAL_PROFILES = ["medshield", "vaultbank", "gridcore"] as const;
export type SalesCanonicalProfile = (typeof SALES_CANONICAL_PROFILES)[number];

export function isSalesCanonicalProfile(value: string): value is SalesCanonicalProfile {
  return (SALES_CANONICAL_PROFILES as readonly string[]).includes(value);
}

/** Strip currency symbols, commas, and whitespace — leaves digits and optional decimal. */
export function stripFinancialFormatting(raw: string): string {
  return raw.replace(/[$,\s]/g, "").trim();
}

export type ParseAleCentsResult = { ok: true; cents: bigint } | { ok: false; error: string };

/**
 * Parse a dollar-denominated ALE string (e.g. `11,100,000.00`) into whole USD cents (BigInt).
 * Commas and `$` are stripped; fractional dollars are rounded to the nearest cent.
 */
export function parseDollarAleToBigIntCents(input: unknown): ParseAleCentsResult {
  const raw = String(input ?? "").trim();
  if (!raw) {
    return { ok: false, error: "ALE baseline is required." };
  }

  const stripped = stripFinancialFormatting(raw);
  if (!/^\d+(\.\d+)?$/.test(stripped)) {
    return { ok: false, error: "ALE baseline must be a numeric dollar amount." };
  }

  const [wholePart, fracPart = ""] = stripped.split(".");
  const fracCents = (fracPart + "00").slice(0, 2);

  try {
    const dollars = BigInt(wholePart || "0");
    const cents = dollars * 100n + BigInt(fracCents || "0");
    if (cents < 0n) {
      return { ok: false, error: "ALE baseline cannot be negative." };
    }
    return { ok: true, cents };
  } catch {
    return { ok: false, error: "ALE baseline exceeds supported integer range." };
  }
}

/** Parse an explicit whole-cent string (no multiply) for sales tooling that already stores cents. */
export function parseExplicitCentAle(input: unknown): ParseAleCentsResult {
  const raw = stripFinancialFormatting(String(input ?? "").trim());
  if (!raw) {
    return { ok: false, error: "aleBaselineCents is required." };
  }
  if (!/^\d+$/.test(raw)) {
    return { ok: false, error: "aleBaselineCents must be a whole number of cents." };
  }
  try {
    const cents = BigInt(raw);
    if (cents < 0n) {
      return { ok: false, error: "ALE baseline cannot be negative." };
    }
    return { ok: true, cents };
  } catch {
    return { ok: false, error: "aleBaselineCents exceeds supported integer range." };
  }
}

export function canonicalAleCentsForProfile(profile: SalesCanonicalProfile): bigint {
  return TENANT_INDUSTRY_BASELINE_ALE_CENTS[profile as TenantKey];
}

export function verifyCanonicalEnterpriseBaseline(
  profile: SalesCanonicalProfile,
  cents: bigint,
): { ok: true } | { ok: false; error: string } {
  const expected = canonicalAleCentsForProfile(profile);
  if (cents !== expected) {
    return {
      ok: false,
      error: `ALE baseline ${cents.toString()} cents does not match canonical ${profile} target (${expected.toString()} cents).`,
    };
  }
  return { ok: true };
}
