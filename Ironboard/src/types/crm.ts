/** Canonical B2B pipeline stages for board CRM tracking. */
export const LEAD_STAGES = [
  'PROSPECT',
  'QUALIFIED',
  'DISCOVERY',
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST',
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

/** Monetary values are whole-cent BIGINT integers — never float dollars. */
export type CentsBigInt = bigint;

export type B2BContact = {
  id: string;
  tenantId: string;
  fullName: string;
  email: string;
  company: string;
  title: string;
  phone: string | null;
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

export type InteractionChannel = 'EMAIL' | 'CALL' | 'MEETING' | 'LINKEDIN' | 'NOTE' | 'OTHER';

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

/** JSON-safe wire shape for Gemini tool responses (cents as decimal strings). */
export type DealRecordWire = Omit<DealRecord, 'valueCents'> & { valueCents: string };

export type DealPipelineWire = Omit<DealPipeline, 'forecastValueCents' | 'deals'> & {
  forecastValueCents: string;
  deals: DealRecordWire[];
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
