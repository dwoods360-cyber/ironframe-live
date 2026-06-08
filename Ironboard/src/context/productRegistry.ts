export interface CompanyProductProfile {
  productKey: string;
  name: string;
  marketCategory: string;
  operationalPriority: 'CRITICAL' | 'HIGH' | 'STANDARD';
  targetFrameworks: string[];
  financialAllocationCents: bigint;
  searchAliases: string[];
}

export const CORE_COMPANY_PRODUCTS: CompanyProductProfile[] = [
  {
    productKey: 'ironframe-core',
    name: 'Ironframe Core',
    marketCategory: 'Executive GRC command post · multi-tenant sovereign isolation · ALE baselines',
    operationalPriority: 'CRITICAL',
    targetFrameworks: ['SOC2', 'ISO 27001', 'CSRD', 'GRI', 'NIST CSF'],
    financialAllocationCents: 2170000000n,
    searchAliases: ['ironframe', 'command post', 'core platform'],
  },
  {
    productKey: 'ironboard-exec',
    name: 'IronBoard Executive',
    marketCategory: 'Standalone board deliberation node · port 8081 air-gapped backplane',
    operationalPriority: 'CRITICAL',
    targetFrameworks: ['SOC2', 'ISO 27001', 'NIST CSF'],
    financialAllocationCents: 0n,
    searchAliases: ['ironboard', 'boardroom', 'executive matrix'],
  },
  {
    productKey: 'docs-hub-accessibility',
    name: 'Docs Hub Accessibility',
    marketCategory: 'Track 1/2 documentation hub · accessibility compliance surface',
    operationalPriority: 'HIGH',
    targetFrameworks: ['WCAG', 'Section 508', 'ISO 27001'],
    financialAllocationCents: 0n,
    searchAliases: ['docs hub', 'documentation', 'accessibility', 'track 1', 'track 2'],
  },
];
