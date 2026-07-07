import { formatCorpusSteps, type EnrichedSupportTicket } from './telemetryReader.js';
import { isAiNarrativeEnabled } from '../loadSupportTeamEnv.js';

export type SupportReplyDraft = {
  intakeInteractionId: string;
  contactId: string;
  subject: string;
  body: string;
  severityTier: EnrichedSupportTicket['severityTier'];
  corpusPlayIds: string[];
  narrativeEnhanced: boolean;
};

function tierLabel(tier: EnrichedSupportTicket['severityTier']): string {
  if (tier === 'T1_CRITICAL') return '🔴 T1 — Data integrity / access';
  if (tier === 'T2_ELEVATED') return '🟡 T2 — Audit blocker';
  return '🟢 T3 — Routine operator guidance';
}

export function composeSupportReplyDraft(ticket: EnrichedSupportTicket): SupportReplyDraft {
  const firstName = ticket.fullName.split(' ')[0] || 'there';
  const steps = formatCorpusSteps(ticket.corpusPlayIds);
  const snapshot = ticket.contextSnapshot;

  const contextLines = snapshot
    ? [
        `Workspace: ${snapshot.tenantSlug}`,
        `Billing: ${snapshot.billingStatus ?? 'unknown'}`,
        `Open threats: ${snapshot.openThreatCount}`,
        `Ironguard violations (7d): ${snapshot.ironguardViolationCount7d}`,
      ]
    : ['Workspace telemetry: unavailable for this poll cycle.'];

  const body = [
    `Hi ${firstName},`,
    '',
    `Severity: ${tierLabel(ticket.severityTier)}`,
    '',
    'We reviewed your support intake with tenant-scoped forensic context (read-only).',
    '',
    '--- Operator request ---',
    ticket.incomingQuery.trim() || ticket.userNotes || '(structured ticket — see objective)',
    '',
    '--- Recommended resolution path ---',
    steps || 'Escalating to platform engineering for manual triage.',
    '',
    '--- Forensic snapshot ---',
    ...contextLines.map((line) => `• ${line}`),
    ticket.telemetryExcerpt ? `\n${ticket.telemetryExcerpt}` : '',
    '',
    'This reply is queued for operator co-sign before any customer-facing dispatch.',
    '— IronSupportTeam (isolated perimeter worker :8086)',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    intakeInteractionId: ticket.interactionId,
    contactId: ticket.contactId,
    subject: `Re: ${ticket.objective || 'Support request'} — ${ticket.company}`,
    body,
    severityTier: ticket.severityTier,
    corpusPlayIds: ticket.corpusPlayIds,
    narrativeEnhanced: isAiNarrativeEnabled(),
  };
}
