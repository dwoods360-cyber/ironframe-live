import {
  CUSTOMER_SUCCESS_KNOWLEDGE_CORPUS,
  resolveRetentionPlayIds,
} from '../knowledge/customerSuccessCorpus.js';
import { resolveBeachheadSuccessProfile } from '../config/beachheadSuccess.js';
import type { HealthAuditResult } from './healthAuditor.js';
import type { ValueQuantification } from './valueQuantifier.js';
import type { ExpansionFinding } from './expansionFinder.js';
import type { AdvisoryType } from '../lib/advisoryIngressClient.js';
import type { BeachheadSector } from '../config/beachheadSuccess.js';

export type AdvisoryDraft = {
  dealId: string;
  contactId: string;
  advisoryType: AdvisoryType;
  subject: string;
  body: string;
  industrySector: BeachheadSector;
  healthScore: number;
  healthBand: HealthAuditResult['healthBand'];
  valueCents: string;
  corpusPlayIds: string[];
  narrativeEnhanced: boolean;
};

function corpusCitationLine(playIds: string[]): string {
  const titles = playIds
    .map((id) => CUSTOMER_SUCCESS_KNOWLEDGE_CORPUS[id]?.title)
    .filter(Boolean)
    .slice(0, 3);
  return titles.length ? `Frameworks applied: ${titles.join('; ')}.` : '';
}

function buildTemplateAdvisory(
  audit: HealthAuditResult,
  value: ValueQuantification,
  finding: ExpansionFinding,
): AdvisoryDraft {
  const profile = resolveBeachheadSuccessProfile(audit.industrySector);
  const firstName = audit.fullName.split(' ')[0] || 'there';
  const playIds =
    finding.corpusPlayIds.length > 0
      ? finding.corpusPlayIds
      : resolveRetentionPlayIds(audit.healthBand);

  const subjectByType: Record<AdvisoryType, string> = {
    EXPANSION: `QBR prep — ${audit.company} expansion path`,
    RETENTION: `Success plan reset — ${audit.company}`,
    QBR: `Quarterly business review — ${audit.company}`,
    ONBOARDING: `90-day success plan — ${audit.company}`,
    CHECK_IN: `Proactive check-in — ${audit.company}`,
  };

  const body = [
    `Hi ${firstName},`,
    '',
    `You are leading ${profile.heroRole} at ${audit.company} — our role is to guide, not hero-sell features.`,
    '',
    `Health snapshot: ${audit.healthScore}/100 (${audit.healthBand}). ${finding.rationale}`,
    '',
    value.roiNarrative,
    '',
    `Recommended focus: ${profile.outcomeNarrative}.`,
    finding.expansionEligible
      ? `When you are ready, we can scope ${profile.expansionModule} with cent-denominated ROI proof.`
      : "Let's stabilize adoption milestones before any expansion conversation.",
    '',
    corpusCitationLine(playIds),
    '',
    '— IronSuccessTeam (pending operator co-sign before send)',
  ].join('\n');

  return {
    dealId: audit.dealId,
    contactId: audit.contactId,
    advisoryType: finding.advisoryType,
    subject: subjectByType[finding.advisoryType],
    body,
    industrySector: profile.sector,
    healthScore: audit.healthScore,
    healthBand: audit.healthBand,
    valueCents: value.valueCents,
    corpusPlayIds: playIds,
    narrativeEnhanced: false,
  };
}

/** ST-04 — template advisory for operator approval queue (no auto-send). */
export async function composeAdvisoryDraft(
  audit: HealthAuditResult,
  value: ValueQuantification,
  finding: ExpansionFinding,
): Promise<AdvisoryDraft> {
  return buildTemplateAdvisory(audit, value, finding);
}
