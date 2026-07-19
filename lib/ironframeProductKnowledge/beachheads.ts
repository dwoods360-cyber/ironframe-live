/**
 * Beachhead sector keys shared by CRM ICP tags, Ironleads, and SalesTeam drafts.
 * Prompt copy (hero/guide/wedge) stays in SalesTeam/src/config/beachheadPrompts.ts.
 */

export const BEACHHEAD_SECTORS = [
  'REGIONAL_BHC',
  'UTILITY_NERC',
  'MSSP_ENCLAVE',
  'HEALTH_HIPAA',
] as const;

export type BeachheadSector = (typeof BEACHHEAD_SECTORS)[number];

/** ICP shorthand → code sector (CRM tags / shortlists). */
export const BEACHHEAD_TAG_TO_SECTOR: Record<string, BeachheadSector> = {
  BHC: 'REGIONAL_BHC',
  UTIL: 'UTILITY_NERC',
  OT: 'UTILITY_NERC',
  NERC: 'UTILITY_NERC',
  MSSP: 'MSSP_ENCLAVE',
  VCISO: 'MSSP_ENCLAVE',
  HEALTH: 'HEALTH_HIPAA',
  HIPAA: 'HEALTH_HIPAA',
};

export const BEACHHEAD_SUMMARIES: Record<
  BeachheadSector,
  { label: string; heroAngle: string; complianceHook: string }
> = {
  REGIONAL_BHC: {
    label: 'Multi-entity / regional BHC',
    heroAngle: 'regional banking CISO or compliance operator',
    complianceHook: 'FFIEC supervision, board reporting cadence, and vendor oversight',
  },
  UTILITY_NERC: {
    label: 'Utility / OT / NERC CIP',
    heroAngle: 'utility CIP program owner or grid security lead',
    complianceHook: 'NERC CIP evidence trails and operational attestations',
  },
  MSSP_ENCLAVE: {
    label: 'MSSP / vCISO',
    heroAngle: 'MSSP governance lead or partner program director',
    complianceHook: 'multi-client governance and partner-led distribution',
  },
  HEALTH_HIPAA: {
    label: 'Healthcare / HIPAA',
    heroAngle: 'healthcare compliance operator or vendor risk lead',
    complianceHook: 'HIPAA vendor risk, patient data privacy, and heavy compliance operations',
  },
};

export function resolveBeachheadSector(sectorOrTag: string | null | undefined): BeachheadSector {
  const raw = String(sectorOrTag ?? 'REGIONAL_BHC').trim().toUpperCase();
  if ((BEACHHEAD_SECTORS as readonly string[]).includes(raw)) {
    return raw as BeachheadSector;
  }
  return BEACHHEAD_TAG_TO_SECTOR[raw] ?? 'REGIONAL_BHC';
}
