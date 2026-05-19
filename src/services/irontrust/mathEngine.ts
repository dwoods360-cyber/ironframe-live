/**
 * Agent 3 (Irontrust): maturity adjustments driven by quarantine ledger targeting a tenant.
 */
export const QUARANTINE_STRIKE2_MATURITY_PENALTY = 0.5;
export const QUARANTINE_HARD_BAN_MATURITY_PENALTY = 1.5;
/** Strike-2 / hard-ban rows with no ledger activity in this window do not reduce maturity (recovery path). */
export const QUARANTINE_TARGET_INACTIVITY_MS = 7 * 24 * 60 * 60 * 1000;

export type QuarantineTargetingLedgerRow = {
  offenseCount: number;
  isHardBan: boolean;
  lastViolationAt: Date;
};

export type MaturityPenaltyFromQuarantineParams = {
  now: Date;
  lastChaosForensicHardeningAt: Date | null;
};

/**
 * Weighted penalty for ledger identifiers targeting `tenant_uuid` (strike 2 vs hard ban).
 * Penalty is suppressed after a successful chaos forensic cycle if it completes after the latest
 * adversarial activity among contributing rows. Floor at 0 is applied by the caller (`clampMaturityScore`).
 */
export function maturityPenaltyFromQuarantineTargeting(
  rows: QuarantineTargetingLedgerRow[],
  params: MaturityPenaltyFromQuarantineParams,
): { penaltyPoints: number; contributingLedgerRows: number } {
  if (rows.length === 0) return { penaltyPoints: 0, contributingLedgerRows: 0 };

  const cutoff = params.now.getTime() - QUARANTINE_TARGET_INACTIVITY_MS;
  const activeRows = rows.filter((r) => r.lastViolationAt.getTime() >= cutoff);
  if (activeRows.length === 0) return { penaltyPoints: 0, contributingLedgerRows: 0 };

  let maxViolation = 0;
  for (const r of activeRows) {
    maxViolation = Math.max(maxViolation, r.lastViolationAt.getTime());
  }
  const chaosAt = params.lastChaosForensicHardeningAt?.getTime() ?? 0;
  if (chaosAt > 0 && chaosAt >= maxViolation) {
    return { penaltyPoints: 0, contributingLedgerRows: 0 };
  }

  let penalty = 0;
  for (const r of activeRows) {
    if (r.isHardBan) penalty += QUARANTINE_HARD_BAN_MATURITY_PENALTY;
    else if (r.offenseCount === 2) penalty += QUARANTINE_STRIKE2_MATURITY_PENALTY;
  }
  return { penaltyPoints: penalty, contributingLedgerRows: activeRows.length };
}
