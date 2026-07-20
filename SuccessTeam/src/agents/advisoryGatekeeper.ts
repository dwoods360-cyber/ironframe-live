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
import {
  PARTNER_GET_STARTED_HREF,
  PARTNER_OPERATOR_PACKET_HREF,
  PARTNER_TRAINING_INDEX_HREF,
  buildPartnerLearningLinksBlurb,
} from '../../../lib/ironframeProductKnowledge/productFacts.js';
import { DESIGN_PARTNER_SUCCESS_CRITERIA_COUNT } from '../../../lib/ironframeProductKnowledge/commercial.js';

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

function buildOnboardingBody(
  audit: HealthAuditResult,
  value: ValueQuantification,
  finding: ExpansionFinding,
  firstName: string,
  profileOutcome: string,
): string {
  return [
    `Hi ${firstName},`,
    '',
    `Welcome to your Ironframe Path B command post at ${audit.company}. Our job is to help you hit the ${DESIGN_PARTNER_SUCCESS_CRITERIA_COUNT} success criteria on your signed order form — not to tour every feature.`,
    '',
    `Start here (in order):`,
    `1. Operator Packet — ${PARTNER_OPERATOR_PACKET_HREF}`,
    `2. Curated partner training — ${PARTNER_TRAINING_INDEX_HREF}`,
    `3. In-app Get Started checklist — ${PARTNER_GET_STARTED_HREF}`,
    '',
    `Target first value: complete Get Started, set your primary-entity ALE / Integrity baseline, and exercise evidence → export on *your* tenant.`,
    '',
    `Health snapshot: ${audit.healthScore}/100 (${audit.healthBand}). ${finding.rationale}`,
    '',
    value.roiNarrative,
    '',
    `Recommended focus: ${profileOutcome}.`,
    `Reply with which order-form criterion you want to land first — we will keep eng syncs capped and route break/fix to Support.`,
    '',
    corpusCitationLine(finding.corpusPlayIds),
    '',
    '— IronSuccessTeam (pending operator co-sign before send)',
  ].join('\n');
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

  const body =
    finding.advisoryType === 'ONBOARDING'
      ? buildOnboardingBody(audit, value, finding, firstName, profile.outcomeNarrative)
      : [
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
            ? `When you are ready, we can scope ${profile.expansionModule} with defendable dollar ROI proof.`
            : "Let's stabilize adoption milestones before any expansion conversation.",
          '',
          finding.advisoryType === 'CHECK_IN'
            ? `If the team still needs the learning path: ${buildPartnerLearningLinksBlurb()}`
            : '',
          '',
          corpusCitationLine(playIds),
          '',
          '— IronSuccessTeam (pending operator co-sign before send)',
        ]
          .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
          .join('\n');

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
