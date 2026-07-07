export const BEACHHEAD_SECTORS = [
  'REGIONAL_BHC',
  'UTILITY_NERC',
  'MSSP_ENCLAVE',
  'HEALTH_HIPAA',
  'UNCLASSIFIED',
] as const;

export type BeachheadSector = (typeof BEACHHEAD_SECTORS)[number];

/** Canonical lead-generation knowledge entry kinds. */
export const LEAD_GEN_ENTRY_KINDS = ['book', 'strategy', 'framework'] as const;
export type LeadGenEntryKind = (typeof LEAD_GEN_ENTRY_KINDS)[number];

export const LEAD_GEN_CATEGORIES = [
  'outbound_prospecting',
  'inbound_demand_gen',
  'account_based_marketing',
  'trigger_intelligence',
  'social_selling',
  'positioning_messaging',
  'sales_development',
  'partner_channel',
  'executive_selling',
] as const;

export type LeadGenCategory = (typeof LEAD_GEN_CATEGORIES)[number];

export const LEAD_GEN_TRIGGER_SIGNALS = [
  'REG_FINE',
  'NEW_CISO',
  'M_AND_A',
  'COMPLIANCE_JOB_POST',
  'BOARD_MANDATE_DOLLAR_RISK',
  'FUNDING_ROUND',
  'AUDIT_FINDING',
  'BREACH_DISCLOSURE',
] as const;

export type LeadGenTriggerSignal = (typeof LEAD_GEN_TRIGGER_SIGNALS)[number];

export type LeadGenKnowledgeEntry = {
  readonly id: string;
  readonly kind: LeadGenEntryKind;
  readonly title: string;
  readonly authors: readonly string[];
  readonly publicationYear?: number;
  readonly category: LeadGenCategory;
  readonly coreConcept: string;
  /** How Ironframe / Ironleads applies this corpus entry to regulated mid-market GRC. */
  readonly ironframeApplication: string;
  readonly beachheadSectors: readonly BeachheadSector[] | 'ALL';
  readonly keyTactics: readonly string[];
  readonly discoveryQuestions?: readonly string[];
  readonly osintVectors?: readonly string[];
  readonly triggerSignals?: readonly LeadGenTriggerSignal[];
  readonly antiPatterns?: readonly string[];
  /** Cross-reference to IronBoard sales methodology playbooks when applicable. */
  readonly complementaryIronboardPlaybooks?: readonly string[];
};

export type LeadGenKnowledgeManifest = {
  readonly manifestVersion: string;
  readonly corpusId: string;
  readonly title: string;
  readonly description: string;
  readonly generatedAt: string;
  readonly entryCount: number;
  readonly categories: readonly LeadGenCategory[];
  readonly beachheadAlignment: readonly string[];
};

export type LeadGenKnowledgeSummary = {
  readonly id: string;
  readonly kind: LeadGenEntryKind;
  readonly title: string;
  readonly authors: readonly string[];
  readonly category: LeadGenCategory;
  readonly coreConcept: string;
  readonly beachheadSectors: readonly BeachheadSector[] | 'ALL';
};

export function isLeadGenCategory(value: string): value is LeadGenCategory {
  return (LEAD_GEN_CATEGORIES as readonly string[]).includes(value);
}

export function isLeadGenEntryKind(value: string): value is LeadGenEntryKind {
  return (LEAD_GEN_ENTRY_KINDS as readonly string[]).includes(value);
}
