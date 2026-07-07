export const BEACHHEAD_SECTORS = [
  'REGIONAL_BHC',
  'UTILITY_NERC',
  'MSSP_ENCLAVE',
  'HEALTH_HIPAA',
  'UNCLASSIFIED',
] as const;

export type BeachheadSector = (typeof BEACHHEAD_SECTORS)[number];

export type BeachheadSuccessProfile = {
  sector: BeachheadSector;
  heroRole: string;
  complianceHook: string;
  outcomeNarrative: string;
  expansionModule: string;
};

const PROFILES: Record<BeachheadSector, BeachheadSuccessProfile> = {
  REGIONAL_BHC: {
    sector: 'REGIONAL_BHC',
    heroRole: 'board-ready GRC and FFIEC oversight',
    complianceHook: 'FFIEC and board risk committee reporting',
    outcomeNarrative: 'LP-10 config churn visibility and LP-16 meta-audit rows without spreadsheet drift',
    expansionModule: 'additional business unit tenant or enterprise seat pack',
  },
  UTILITY_NERC: {
    sector: 'UTILITY_NERC',
    heroRole: 'NERC CIP and grid cyber asset governance',
    complianceHook: 'NERC audit calendar and critical cyber asset attestation',
    outcomeNarrative: 'Ironscribe sustainability achievement reports and grid intensity samples for disclosures',
    expansionModule: 'NERC module expansion or additional BA scope',
  },
  MSSP_ENCLAVE: {
    sector: 'MSSP_ENCLAVE',
    heroRole: 'multi-client enclave evidence programs',
    complianceHook: 'tenant-sovereign Ironguard RLS per client enclave',
    outcomeNarrative: 'per-enclave evidence slot coverage without cross-client data blending',
    expansionModule: 'additional client enclave tenant',
  },
  HEALTH_HIPAA: {
    sector: 'HEALTH_HIPAA',
    heroRole: 'HIPAA privacy and security evidence',
    complianceHook: 'OCR enforcement context and PHI-safe exports',
    outcomeNarrative: 'maskSensitiveData discipline on exports with Irontally HIPAA control coverage',
    expansionModule: 'HIPAA control pack or BAA workflow module',
  },
  UNCLASSIFIED: {
    sector: 'UNCLASSIFIED',
    heroRole: 'quantitative GRC command post operations',
    complianceHook: 'audit-ready evidence and dollar-denominated risk',
    outcomeNarrative: 'tenant-scoped command post with whole-cent ALE integrity',
    expansionModule: 'framework pack add-on after outcome proof',
  },
};

export function resolveBeachheadSuccessProfile(sector: string | null | undefined): BeachheadSuccessProfile {
  const key = (sector?.trim() || 'UNCLASSIFIED') as BeachheadSector;
  return PROFILES[key] ?? PROFILES.UNCLASSIFIED;
}
