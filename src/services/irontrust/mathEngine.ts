import { computeSustainabilityAleForTenantUuid } from "@/app/services/ironbloom/scoring";

const TENANT_BASELINE_CENTS: Record<string, bigint> = {
  MEDSHIELD: 1110000000n,
  VAULTBANK: 590000000n,
  GRIDCORE: 470000000n,
};

function extractKwh(payload: Record<string, unknown>): number {
  if (typeof payload.units_kwh === "number") return payload.units_kwh;
  if (typeof payload.kwh === "number") return payload.kwh;
  if (typeof payload.unitsKwh === "number") return payload.unitsKwh;
  if (typeof payload.kwhAverted === "number") return payload.kwhAverted;
  return 0;
}

function isSustainabilityPayload(payload: Record<string, unknown>): boolean {
  const haystack = JSON.stringify(payload).toLowerCase();
  return (
    extractKwh(payload) > 0 ||
    haystack.includes("carbon") ||
    haystack.includes("kwh") ||
    haystack.includes("sustainability")
  );
}

export type IrontrustValuation = {
  mitigatedValueCents: bigint;
  financialAleCents: bigint;
  sustainabilityAleCents: bigint;
};

/** Recent adversarial quarantine activity window for maturity siege penalties. */
export const QUARANTINE_TARGET_INACTIVITY_MS = 30 * 24 * 60 * 60 * 1000;

const QUARANTINE_STRIKE2_PENALTY = 0.5;
const QUARANTINE_HARD_BAN_PENALTY = 1.5;

export type QuarantineLedgerMaturityRow = {
  offenseCount: number;
  isHardBan: boolean;
  lastViolationAt: Date;
};

export type QuarantineMaturityPenaltyResult = {
  penaltyPoints: number;
  contributingLedgerRows: number;
};

/**
 * Irontrust maturity deduction from tenant-targeted quarantine ledger strikes.
 */
export function maturityPenaltyFromQuarantineTargeting(
  ledgerRows: QuarantineLedgerMaturityRow[],
  ctx: { now: Date; lastChaosForensicHardeningAt: Date | null },
): QuarantineMaturityPenaltyResult {
  const { now, lastChaosForensicHardeningAt } = ctx;
  let penaltyPoints = 0;
  let contributingLedgerRows = 0;

  for (const row of ledgerRows) {
    const lastViolationAt =
      row.lastViolationAt instanceof Date
        ? row.lastViolationAt
        : new Date(row.lastViolationAt);

    if (now.getTime() - lastViolationAt.getTime() > QUARANTINE_TARGET_INACTIVITY_MS) {
      continue;
    }

    if (
      lastChaosForensicHardeningAt &&
      lastChaosForensicHardeningAt.getTime() >= lastViolationAt.getTime()
    ) {
      continue;
    }

    const rowPenalty = row.isHardBan
      ? QUARANTINE_HARD_BAN_PENALTY
      : row.offenseCount >= 2
        ? QUARANTINE_STRIKE2_PENALTY
        : 0;

    if (rowPenalty <= 0) continue;
    penaltyPoints += rowPenalty;
    contributingLedgerRows += 1;
  }

  return { penaltyPoints, contributingLedgerRows };
}

/**
 * Epic 10.3 — Irontrust BigInt valuation core (mutation-tested path via scoring + baselines).
 */
export async function irontrustMathEngine(
  sanitizedPayload: Record<string, unknown>,
  complianceBadges: string[] = [],
): Promise<IrontrustValuation> {
  const tenantUuid = String(
    sanitizedPayload.tenant_id ?? sanitizedPayload.tenantId ?? "",
  ).trim();

  if (tenantUuid && isSustainabilityPayload(sanitizedPayload)) {
    const breakdown = await computeSustainabilityAleForTenantUuid({
      tenantUuid,
      unitsKwh: extractKwh(sanitizedPayload),
      assetId:
        typeof sanitizedPayload.asset_id === "string"
          ? sanitizedPayload.asset_id
          : "FORENSIC_PIPELINE",
      payload: sanitizedPayload,
    });
    const badgeBonus =
      complianceBadges.length > 0
        ? BigInt(Math.min(complianceBadges.length, 5))
        : 0n;
    return {
      mitigatedValueCents: breakdown.mitigatedValueCents + badgeBonus,
      financialAleCents: breakdown.tenantTotalAleCents,
      sustainabilityAleCents: breakdown.mitigatedValueCents,
    };
  }

  const tenantType =
    typeof sanitizedPayload.tenant_type === "string"
      ? sanitizedPayload.tenant_type.toUpperCase()
      : "";
  const baseline = TENANT_BASELINE_CENTS[tenantType] ?? 0n;
  const payloadAmount = BigInt(String(sanitizedPayload.amount_cents ?? 0));
  const mitigatedValueCents =
    payloadAmount > 0n ? payloadAmount : baseline > 0n ? baseline : 0n;

  return {
    mitigatedValueCents,
    financialAleCents: baseline,
    sustainabilityAleCents: 0n,
  };
}
