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
  {
    /** Short operator label (docs / CRM). */
    label: string;
    /** Partner-facing audience name for outbound. */
    audienceFace: string;
    heroAngle: string;
    complianceHook: string;
  }
> = {
  REGIONAL_BHC: {
    label: 'Multi-entity / regional BHC',
    audienceFace: 'multi-entity banks',
    heroAngle: 'regional banking CISO or compliance operator',
    complianceHook: 'FFIEC supervision, board reporting cadence, and vendor oversight',
  },
  UTILITY_NERC: {
    label: 'Utility / OT / NERC CIP',
    audienceFace: 'grid / CIP operators',
    heroAngle: 'utility CIP program owner or grid security lead',
    complianceHook: 'NERC CIP evidence trails and operational attestations',
  },
  MSSP_ENCLAVE: {
    label: 'MSSP / vCISO',
    audienceFace: 'multi-client partners',
    heroAngle: 'MSSP governance lead or partner program director',
    complianceHook: 'multi-client governance and partner-led distribution',
  },
  HEALTH_HIPAA: {
    label: 'Healthcare / HIPAA',
    audienceFace: 'regulated care operators',
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

/**
 * Infer Core 4 beachhead from org name / email / free text (inbound form).
 * Keyword heuristics only — default REGIONAL_BHC.
 */
export function inferBeachheadFromOrgText(input: {
  orgName?: string | null;
  email?: string | null;
  notes?: string | null;
}): BeachheadSector {
  const blob = [input.orgName, input.email, input.notes]
    .map((v) => String(v ?? '').toLowerCase())
    .join(' ');

  if (
    /\b(mssp|vciso|v-ciso|managed security|security partner|multi-client)\b/.test(blob)
  ) {
    return 'MSSP_ENCLAVE';
  }
  if (
    /\b(hipaa|hospital|health\s?care|healthcare|clinic|pharma|patient|fhir)\b/.test(blob)
  ) {
    return 'HEALTH_HIPAA';
  }
  if (
    /\b(nerc|cip|utility|grid|ot\b|scada|pipeline|energy|power\s?co)\b/.test(blob)
  ) {
    return 'UTILITY_NERC';
  }
  if (
    /\b(bank|bhc|fintech|credit\s?union|federal\s?reserve|ffiec|treasury)\b/.test(blob)
  ) {
    return 'REGIONAL_BHC';
  }
  return 'REGIONAL_BHC';
}

/**
 * Map Core 4 → sales-agent BaselineTarget keys (3-value playbook).
 * MSSP maps to regionalBHC commercially; sector stays in notes.
 */
export function beachheadSectorToBaselineTarget(
  sector: BeachheadSector,
): 'regionalBHC' | 'publicPower' | 'communityHealth' {
  switch (sector) {
    case 'UTILITY_NERC':
      return 'publicPower';
    case 'HEALTH_HIPAA':
      return 'communityHealth';
    case 'MSSP_ENCLAVE':
    case 'REGIONAL_BHC':
    default:
      return 'regionalBHC';
  }
}
