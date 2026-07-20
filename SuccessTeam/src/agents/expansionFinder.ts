import { listCorpusEntriesForSector } from '../knowledge/customerSuccessCorpus.js';
import { resolveBeachheadSuccessProfile } from '../config/beachheadSuccess.js';
import type { HealthAuditResult } from './healthAuditor.js';
import type { ValueQuantification } from './valueQuantifier.js';
import type { AdvisoryType } from '../lib/advisoryIngressClient.js';

export type ExpansionFinding = {
  dealId: string;
  advisoryType: AdvisoryType;
  expansionEligible: boolean;
  recommendedModule: string;
  corpusPlayIds: string[];
  rationale: string;
};

/** ST-03 — rules-based onboarding / expansion / retention routing from corpus. */
export function findExpansionMotion(
  audit: HealthAuditResult,
  value: ValueQuantification,
): ExpansionFinding {
  const profile = resolveBeachheadSuccessProfile(audit.industrySector);
  const sectorEntries = listCorpusEntriesForSector(audit.industrySector);
  const beachheadPlay = sectorEntries.find((e) => e.kind === 'playbook')?.id ?? 'land_adopt_expand';

  // Activation first: tenants cannot expand or "check in" meaningfully without FIRST_ACTION.
  if (audit.signals.includes('MISSING_FIRST_ACTION')) {
    return {
      dealId: audit.dealId,
      advisoryType: 'ONBOARDING',
      expansionEligible: false,
      recommendedModule: profile.expansionModule,
      corpusPlayIds: ['design_partner_path_b_onboarding', 'onboarding_playbook_90', 'customer_success'],
      rationale: `MISSING_FIRST_ACTION — run Path B onboarding before expansion/retention theater. ${value.outcomeProofLine}`,
    };
  }

  if (audit.healthBand === 'healthy') {
    return {
      dealId: audit.dealId,
      advisoryType: 'EXPANSION',
      expansionEligible: true,
      recommendedModule: profile.expansionModule,
      corpusPlayIds: ['qbr_expansion_framework', beachheadPlay, 'land_adopt_expand'],
      rationale: `Health ${audit.healthScore} — expansion eligible. ${value.outcomeProofLine}`,
    };
  }

  if (audit.healthBand === 'watch') {
    return {
      dealId: audit.dealId,
      advisoryType: 'CHECK_IN',
      expansionEligible: false,
      recommendedModule: profile.expansionModule,
      corpusPlayIds: ['customer_success', 'onboarding_playbook_90', 'design_partner_path_b_onboarding'],
      rationale: `Watch band — proactive check-in before expansion. ${value.outcomeProofLine}`,
    };
  }

  if (audit.healthBand === 'at_risk') {
    return {
      dealId: audit.dealId,
      advisoryType: 'RETENTION',
      expansionEligible: false,
      recommendedModule: profile.expansionModule,
      corpusPlayIds: ['retention_save_plays', 'effortless_experience'],
      rationale: `At-risk — retention play required. ${audit.auditNotes.join(' ')}`,
    };
  }

  return {
    dealId: audit.dealId,
    advisoryType: 'RETENTION',
    expansionEligible: false,
    recommendedModule: profile.expansionModule,
    corpusPlayIds: ['retention_save_plays', 'chief_customer_officer'],
    rationale: `Critical health — operator escalation. ${audit.auditNotes.join(' ')}`,
  };
}
