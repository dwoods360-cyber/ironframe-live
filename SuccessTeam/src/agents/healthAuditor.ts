import type { HealthSnapshot } from '../lib/healthSnapshotClient.js';
import type { AccountRecord } from '../lib/accountsPollClient.js';

export type HealthAuditResult = {
  dealId: string;
  contactId: string;
  company: string;
  fullName: string;
  industrySector: string;
  healthScore: number;
  healthBand: HealthSnapshot['healthBand'];
  signals: string[];
  daysSinceInteraction: number | null;
  valueCents: string;
  auditNotes: string[];
};

/** ST-01 — deterministic health audit (no LLM math). */
export function auditAccountHealth(
  account: AccountRecord,
  snapshot: HealthSnapshot,
): HealthAuditResult {
  const auditNotes: string[] = [];
  if (snapshot.signals.includes('STALE_ENGAGEMENT')) {
    auditNotes.push('Engagement decay — schedule proactive check-in.');
  }
  if (snapshot.signals.includes('LOW_EVIDENCE_COMPLETENESS')) {
    auditNotes.push('Evidence completeness below threshold — guided workshop recommended.');
  }
  if (snapshot.signals.includes('MISSING_FIRST_ACTION')) {
    auditNotes.push('FIRST_ACTION milestone missing — onboarding playbook required.');
  }
  if (snapshot.healthBand === 'critical') {
    auditNotes.push('Critical band — operator escalation before any expansion motion.');
  }

  return {
    dealId: account.dealId,
    contactId: account.contactId,
    company: account.company,
    fullName: account.fullName,
    industrySector: account.industrySector ?? 'UNCLASSIFIED',
    healthScore: snapshot.healthScore,
    healthBand: snapshot.healthBand,
    signals: snapshot.signals,
    daysSinceInteraction: snapshot.daysSinceInteraction,
    valueCents: snapshot.valueCents,
    auditNotes,
  };
}
