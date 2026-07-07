/** Canonical B2B pipeline stages for board CRM tracking. */
export const LEAD_STAGES = [
  'SUSPECT',
  'PROSPECT',
  'QUALIFIED',
  'DISCOVERY',
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST',
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

export const BEACHHEAD_SECTORS = [
  'REGIONAL_BHC',
  'UTILITY_NERC',
  'MSSP_ENCLAVE',
  'HEALTH_HIPAA',
  'UNCLASSIFIED',
] as const;

export type BeachheadSector = (typeof BEACHHEAD_SECTORS)[number];

export const LEAD_INGESTION_SOURCES = [
  'MANUAL_INPUT',
  'INBOUND_PORTAL',
  'AUTONOMOUS_CRAWLER',
] as const;

export type LeadIngestionSource = (typeof LEAD_INGESTION_SOURCES)[number];

export const TRIGGER_SIGNALS = [
  'REG_FINE',
  'NEW_CISO',
  'M_AND_A',
  'COMPLIANCE_JOB_POST',
  'BOARD_MANDATE_DOLLAR_RISK',
] as const;

export type TriggerSignal = (typeof TRIGGER_SIGNALS)[number];

/** Monetary values are whole-cent BIGINT integers — never float dollars. */
export type CentsBigInt = bigint;

export type PainMarkers = {
  manualBoardReporting?: boolean;
  noDollarRiskQuant?: boolean;
  fragmentedGrc?: boolean;
  multiEntityGovernance?: boolean;
};

export type MethodologyMarkers = {
  commercialInsightDelivered?: boolean;
  spinSituationReduced?: boolean;
};

export type QualificationSignals = {
  beachheadScore: number;
  painScore: number;
  triggerScore: number;
  methodologyScore: number;
  priorityWeight: number;
  painMarkers?: PainMarkers;
  triggers?: TriggerSignal[];
  methodology?: MethodologyMarkers;
  computedAt: string;
};

export type B2BContact = {
  id: string;
  tenantId: string;
  fullName: string;
  email: string;
  company: string;
  title: string;
  phone: string | null;
  industrySector: BeachheadSector | null;
  detectedTrigger: string | null;
  ingestionSource: LeadIngestionSource;
  priorityScore: number;
  qualificationSignals: QualificationSignals;
  vulnerabilityClass: 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: string;
  updatedAt: string;
};

export type DealRecord = {
  id: string;
  tenantId: string;
  title: string;
  stage: LeadStage;
  /** Whole-cent ledger value (e.g. 250000000 = $2,500,000.00). */
  valueCents: CentsBigInt;
  primaryContactId: string;
  accountDomain: string | null;
  ownerAgentId: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type InteractionChannel =
  | 'EMAIL'
  | 'CALL'
  | 'MEETING'
  | 'LINKEDIN'
  | 'NOTE'
  | 'SYSTEM_AGENT'
  | 'OTHER';

export type InteractionLog = {
  id: string;
  tenantId: string;
  dealId: string | null;
  contactId: string | null;
  channel: InteractionChannel;
  summary: string;
  occurredAt: string;
  createdAt: string;
};

export type DealPipeline = {
  tenantId: string;
  deals: DealRecord[];
  contacts: B2BContact[];
  interactions: InteractionLog[];
  /** Sum of open-pipeline deal values in cents (excludes CLOSED_LOST). */
  forecastValueCents: CentsBigInt;
  updatedAt: string;
};

export type CreateContactInput = {
  fullName: string;
  email: string;
  company: string;
  title?: string;
  phone?: string | null;
  industrySector?: BeachheadSector | null;
  detectedTrigger?: string | null;
  ingestionSource?: LeadIngestionSource;
  painMarkers?: PainMarkers;
  triggers?: TriggerSignal[];
  methodology?: MethodologyMarkers;
};

export type UpdateQualificationInput = {
  contactId: string;
  industrySector?: BeachheadSector | null;
  detectedTrigger?: string | null;
  painMarkers?: PainMarkers;
  triggers?: TriggerSignal[];
  methodology?: MethodologyMarkers;
};

export type CreateDealInput = {
  title: string;
  stage?: LeadStage;
  valueCents: CentsBigInt | string | number;
  primaryContactId: string;
  accountDomain?: string | null;
  ownerAgentId?: string | null;
  notes?: string;
};

export type LogInteractionInput = {
  dealId?: string | null;
  contactId?: string | null;
  channel: InteractionChannel;
  summary: string;
  occurredAt?: string;
};

export type IronleadsIngressInput = {
  companyName: string;
  industrySector: BeachheadSector;
  detectedTrigger: string;
  targetTenantSlug: string;
  contactEmail?: string;
  contactName?: string;
  accountDomain?: string;
};

/** JSON-safe wire shape for Gemini tool responses (cents as decimal strings). */
export type DealRecordWire = Omit<DealRecord, 'valueCents'> & { valueCents: string };

export type DealPipelineWire = Omit<DealPipeline, 'forecastValueCents' | 'deals'> & {
  forecastValueCents: string;
  deals: DealRecordWire[];
};

export type PrioritizedLeadsWire = {
  tenantId: string;
  contacts: B2BContact[];
  updatedAt: string;
};

export function parseCentsInput(raw: unknown): CentsBigInt {
  if (typeof raw === 'bigint') return raw;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || !Number.isInteger(raw)) {
      throw new Error('valueCents must be an integer number of cents');
    }
    return BigInt(raw);
  }
  const text = String(raw ?? '').trim();
  if (!/^-?\d+$/.test(text)) {
    throw new Error('valueCents must be a whole-cent integer string');
  }
  return BigInt(text);
}

export function centsToWire(value: CentsBigInt): string {
  return value.toString();
}

export function isLeadStage(value: string): value is LeadStage {
  return (LEAD_STAGES as readonly string[]).includes(value);
}

export function isBeachheadSector(value: string): value is BeachheadSector {
  return (BEACHHEAD_SECTORS as readonly string[]).includes(value);
}

export function isLeadIngestionSource(value: string): value is LeadIngestionSource {
  return (LEAD_INGESTION_SOURCES as readonly string[]).includes(value);
}

export function isTriggerSignal(value: string): value is TriggerSignal {
  return (TRIGGER_SIGNALS as readonly string[]).includes(value);
}
