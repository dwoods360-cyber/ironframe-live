export type BeachheadSector =
  | 'REGIONAL_BHC'
  | 'UTILITY_NERC'
  | 'MSSP_ENCLAVE'
  | 'HEALTH_HIPAA';

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
    heroRole: 'regional banking CISO or compliance operator',
    guidePlan:
      'map FFIEC board accountability to a single governed command post with Microsoft-ecosystem evidence exports',
    wedgeCentsNarrative:
      'quantify dollar-denominated loss exposure in whole cents, then push prioritized remediation into Jira and M365',
    complianceHook: 'FFIEC supervision, board reporting cadence, and vendor oversight',
  },
  UTILITY_NERC: {
    sector: 'UTILITY_NERC',
    heroRole: 'utility CIP program owner or grid security lead',
    guidePlan:
      'tie operational evidence tracking to NERC workflow checkpoints without spreadsheet drift',
    wedgeCentsNarrative:
      'express outage and compliance exposure as integer cents before any control task hits the field',
    complianceHook: 'NERC CIP evidence trails and operational attestations',
  },
  HEALTH_HIPAA: {
    sector: 'HEALTH_HIPAA',
    heroRole: 'healthcare compliance operator or vendor risk lead',
    guidePlan:
      'unify vendor risk, patient privacy controls, and audit-ready evidence in one tenant-scoped workspace',
    wedgeCentsNarrative:
      'frame breach and vendor-risk exposure as pristine BigInt cents tied to remediation tasks',
    complianceHook: 'HIPAA vendor risk, patient data privacy, and heavy compliance operations',
  },
  MSSP_ENCLAVE: {
    sector: 'MSSP_ENCLAVE',
    heroRole: 'MSSP governance lead or partner program director',
    guidePlan:
      'deliver multi-client governance with strict tenant isolation and partner-ready reporting',
    wedgeCentsNarrative:
      'show each client enclave its own cents-grade loss model without cross-tenant bleed',
    complianceHook: 'multi-client governance and partner-led distribution',
  },
};

export function resolveBeachheadPrompt(sector: string | null | undefined): BeachheadPrompt {
  const key = String(sector ?? 'REGIONAL_BHC').trim().toUpperCase();
  if (key in BEACHHEAD_PROMPTS) {
    return BEACHHEAD_PROMPTS[key as BeachheadSector];
  }
  return BEACHHEAD_PROMPTS.REGIONAL_BHC;
}
