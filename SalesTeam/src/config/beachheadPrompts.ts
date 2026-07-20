import {
  BEACHHEAD_SECTORS,
  BEACHHEAD_SUMMARIES,
  resolveBeachheadSector,
  type BeachheadSector,
} from '../../../lib/ironframeProductKnowledge/beachheads.js';

export type { BeachheadSector };
export { BEACHHEAD_SECTORS, resolveBeachheadSector };

export type BeachheadPrompt = {
  sector: BeachheadSector;
  heroRole: string;
  guidePlan: string;
  wedgeCentsNarrative: string;
  complianceHook: string;
};

/** StoryBrand SB7 + Core 4 beachhead angles — deterministic outbound scaffolding. */
export const BEACHHEAD_PROMPTS: Record<BeachheadSector, BeachheadPrompt> = {
  REGIONAL_BHC: {
    sector: 'REGIONAL_BHC',
    heroRole: BEACHHEAD_SUMMARIES.REGIONAL_BHC.heroAngle,
    guidePlan:
      'map FFIEC board accountability to a single governed command post with Microsoft-ecosystem evidence exports',
    wedgeCentsNarrative:
      'quantify dollar-denominated loss exposure in whole cents, then push prioritized remediation into Jira and M365',
    complianceHook: BEACHHEAD_SUMMARIES.REGIONAL_BHC.complianceHook,
  },
  UTILITY_NERC: {
    sector: 'UTILITY_NERC',
    heroRole: BEACHHEAD_SUMMARIES.UTILITY_NERC.heroAngle,
    guidePlan:
      'tie operational evidence tracking to NERC workflow checkpoints without spreadsheet drift',
    wedgeCentsNarrative:
      'express outage and compliance exposure as integer cents before any control task hits the field',
    complianceHook: BEACHHEAD_SUMMARIES.UTILITY_NERC.complianceHook,
  },
  HEALTH_HIPAA: {
    sector: 'HEALTH_HIPAA',
    heroRole: BEACHHEAD_SUMMARIES.HEALTH_HIPAA.heroAngle,
    guidePlan:
      'unify vendor risk, patient privacy controls, and audit-ready evidence in one tenant-scoped workspace',
    wedgeCentsNarrative:
      'frame breach and vendor-risk exposure as pristine BigInt cents tied to remediation tasks',
    complianceHook: BEACHHEAD_SUMMARIES.HEALTH_HIPAA.complianceHook,
  },
  MSSP_ENCLAVE: {
    sector: 'MSSP_ENCLAVE',
    heroRole: BEACHHEAD_SUMMARIES.MSSP_ENCLAVE.heroAngle,
    guidePlan:
      'deliver multi-client governance with strict tenant isolation and partner-ready reporting',
    wedgeCentsNarrative:
      'show each client enclave its own cents-grade loss model without cross-tenant bleed',
    complianceHook: BEACHHEAD_SUMMARIES.MSSP_ENCLAVE.complianceHook,
  },
};

export function resolveBeachheadPrompt(sector: string | null | undefined): BeachheadPrompt {
  const key = resolveBeachheadSector(sector);
  return BEACHHEAD_PROMPTS[key];
}
