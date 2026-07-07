export const BEACHHEAD_SECTORS = [
  'REGIONAL_BHC',
  'UTILITY_NERC',
  'MSSP_ENCLAVE',
  'HEALTH_HIPAA',
  'UNCLASSIFIED',
] as const;

export type BeachheadSector = (typeof BEACHHEAD_SECTORS)[number];

export const CS_ENTRY_KINDS = ['book', 'strategy', 'framework', 'playbook'] as const;
export type CsEntryKind = (typeof CS_ENTRY_KINDS)[number];

export const CS_CATEGORIES = [
  'retention_churn',
  'onboarding_adoption',
  'health_scoring',
  'expansion_upsell',
  'qbr_executive',
  'customer_intimacy',
  'outcome_based_success',
  'voice_of_customer',
  'renewal_negotiation',
  'cs_operations',
] as const;

export type CsCategory = (typeof CS_CATEGORIES)[number];

export const CS_HEALTH_SIGNALS = [
  'STALE_ENGAGEMENT',
  'LOW_EVIDENCE_COMPLETENESS',
  'MISSED_PILOT_GATE',
  'CONFIG_CHURN_SPIKE',
  'DECLINING_LOGIN',
  'NEGATIVE_NPS',
  'SUPPORT_ESCALATION',
  'RENEWAL_WINDOW',
] as const;

export type CsHealthSignal = (typeof CS_HEALTH_SIGNALS)[number];

export type CustomerSuccessKnowledgeEntry = {
  readonly id: string;
  readonly kind: CsEntryKind;
  readonly title: string;
  readonly authors: readonly string[];
  readonly publicationYear?: number;
  readonly category: CsCategory;
  readonly coreConcept: string;
  readonly ironframeApplication: string;
  readonly beachheadSectors: readonly BeachheadSector[] | 'ALL';
  readonly keyTactics: readonly string[];
  readonly healthSignals?: readonly CsHealthSignal[];
  readonly expansionPlays?: readonly string[];
  readonly retentionPlays?: readonly string[];
  readonly renewalPlays?: readonly string[];
  readonly antiPatterns?: readonly string[];
  readonly complementaryCorpusIds?: readonly string[];
};

export type CustomerSuccessKnowledgeManifest = {
  readonly manifestVersion: string;
  readonly corpusId: string;
  readonly title: string;
  readonly description: string;
  readonly generatedAt: string;
  readonly entryCount: number;
  readonly categories: readonly CsCategory[];
};
