import type { HealthAuditResult } from './healthAuditor.js';

export type ValueQuantification = {
  dealId: string;
  valueCents: string;
  valueDisplay: string;
  roiNarrative: string;
  outcomeProofLine: string;
};

function formatCentsDisplay(valueCents: string): string {
  try {
    const cents = BigInt(valueCents || '0');
    const dollars = cents / 100n;
    const remainder = cents % 100n;
    return `$${dollars.toString()}.${remainder.toString().padStart(2, '0')}`;
  } catch {
    return '$0.00';
  }
}

/** ST-02 — BigInt ROI narrative only (no float ALE math). */
export function quantifyAccountValue(audit: HealthAuditResult): ValueQuantification {
  const valueDisplay = formatCentsDisplay(audit.valueCents);
  const roiNarrative = [
    `Contract value anchored at ${valueDisplay} (whole cents — no float drift).`,
    `Health score ${audit.healthScore}/100 (${audit.healthBand}) informs renewal and expansion timing.`,
    'Irontrust ALE and evidence export hashes are the proof layer — not vanity login metrics.',
  ].join(' ');

  const outcomeProofLine =
    audit.healthBand === 'healthy'
      ? 'Outcome proof sufficient for expansion qualification per land-adopt-expand.'
      : 'Outcome proof incomplete — prioritize adoption milestones before expansion.';

  return {
    dealId: audit.dealId,
    valueCents: audit.valueCents,
    valueDisplay,
    roiNarrative,
    outcomeProofLine,
  };
}
