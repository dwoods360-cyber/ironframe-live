import { randomUUID } from 'node:crypto';
import type {
  B2BContact,
  CreateContactInput,
  CreateDealInput,
  DealPipeline,
  DealPipelineWire,
  DealRecord,
  DealRecordWire,
  InteractionLog,
  LeadStage,
  LogInteractionInput,
} from '../../types/crm.js';
import {
  centsToWire,
  isLeadStage,
  parseCentsInput,
} from '../../types/crm.js';

type TenantStore = {
  contacts: Map<string, B2BContact>;
  deals: Map<string, DealRecord>;
  interactions: Map<string, InteractionLog>;
};

const tenantStores = new Map<string, TenantStore>();

function nowIso(): string {
  return new Date().toISOString();
}

function requireTenantId(raw: unknown): string {
  const tenantId = String(raw ?? '').trim();
  if (!tenantId) throw new Error('tenantId is required for tenant-isolated CRM access');
  return tenantId;
}

function getStore(tenantId: string): TenantStore {
  let store = tenantStores.get(tenantId);
  if (!store) {
    store = { contacts: new Map(), deals: new Map(), interactions: new Map() };
    tenantStores.set(tenantId, store);
  }
  return store;
}

function assertTenantRecord<T extends { tenantId: string }>(record: T, tenantId: string): T {
  if (record.tenantId !== tenantId) {
    throw new Error('Cross-tenant CRM access denied');
  }
  return record;
}

function sumForecastCents(deals: DealRecord[]): bigint {
  let total = 0n;
  for (const deal of deals) {
    if (deal.stage !== 'CLOSED_LOST') total += deal.valueCents;
  }
  return total;
}

function toDealWire(deal: DealRecord): DealRecordWire {
  return { ...deal, valueCents: centsToWire(deal.valueCents) };
}

function buildPipeline(tenantId: string, store: TenantStore): DealPipeline {
  const deals = [...store.deals.values()].sort(
    (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  );
  return {
    tenantId,
    deals,
    contacts: [...store.contacts.values()].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    interactions: [...store.interactions.values()].sort((a, b) =>
      b.occurredAt.localeCompare(a.occurredAt),
    ),
    forecastValueCents: sumForecastCents(deals),
    updatedAt: nowIso(),
  };
}

function toPipelineWire(pipeline: DealPipeline): DealPipelineWire {
  return {
    ...pipeline,
    forecastValueCents: centsToWire(pipeline.forecastValueCents),
    deals: pipeline.deals.map(toDealWire),
  };
}

export function listPipeline(tenantIdRaw: unknown): DealPipelineWire {
  const tenantId = requireTenantId(tenantIdRaw);
  return toPipelineWire(buildPipeline(tenantId, getStore(tenantId)));
}

export function getDeal(tenantIdRaw: unknown, dealIdRaw: unknown): DealRecordWire {
  const tenantId = requireTenantId(tenantIdRaw);
  const dealId = String(dealIdRaw ?? '').trim();
  if (!dealId) throw new Error('dealId is required');
  const deal = getStore(tenantId).deals.get(dealId);
  if (!deal) throw new Error(`Deal not found: ${dealId}`);
  return toDealWire(assertTenantRecord(deal, tenantId));
}

export function listContacts(tenantIdRaw: unknown): B2BContact[] {
  const tenantId = requireTenantId(tenantIdRaw);
  return [...getStore(tenantId).contacts.values()].sort((a, b) =>
    a.fullName.localeCompare(b.fullName),
  );
}

export function createContact(tenantIdRaw: unknown, input: CreateContactInput): B2BContact {
  const tenantId = requireTenantId(tenantIdRaw);
  const fullName = String(input.fullName ?? '').trim();
  const email = String(input.email ?? '').trim();
  const company = String(input.company ?? '').trim();
  if (!fullName || !email || !company) {
    throw new Error('fullName, email, and company are required');
  }
  const stamp = nowIso();
  const contact: B2BContact = {
    id: randomUUID(),
    tenantId,
    fullName,
    email,
    company,
    title: String(input.title ?? '').trim(),
    phone: input.phone ? String(input.phone).trim() : null,
    createdAt: stamp,
    updatedAt: stamp,
  };
  getStore(tenantId).contacts.set(contact.id, contact);
  return contact;
}

export function createDeal(tenantIdRaw: unknown, input: CreateDealInput): DealRecordWire {
  const tenantId = requireTenantId(tenantIdRaw);
  const store = getStore(tenantId);
  const title = String(input.title ?? '').trim();
  const primaryContactId = String(input.primaryContactId ?? '').trim();
  if (!title || !primaryContactId) throw new Error('title and primaryContactId are required');
  const contact = store.contacts.get(primaryContactId);
  if (!contact) throw new Error(`Contact not found: ${primaryContactId}`);
  assertTenantRecord(contact, tenantId);

  const stage: LeadStage = input.stage && isLeadStage(input.stage) ? input.stage : 'PROSPECT';
  const stamp = nowIso();
  const deal: DealRecord = {
    id: randomUUID(),
    tenantId,
    title,
    stage,
    valueCents: parseCentsInput(input.valueCents),
    primaryContactId,
    accountDomain: input.accountDomain ? String(input.accountDomain).trim() : null,
    ownerAgentId: input.ownerAgentId ? String(input.ownerAgentId).trim() : null,
    notes: String(input.notes ?? '').trim(),
    createdAt: stamp,
    updatedAt: stamp,
  };
  store.deals.set(deal.id, deal);
  return toDealWire(deal);
}

export function updateDealStage(
  tenantIdRaw: unknown,
  dealIdRaw: unknown,
  stageRaw: unknown,
): DealRecordWire {
  const tenantId = requireTenantId(tenantIdRaw);
  const dealId = String(dealIdRaw ?? '').trim();
  const stage = String(stageRaw ?? '').trim();
  if (!dealId) throw new Error('dealId is required');
  if (!isLeadStage(stage)) throw new Error(`Invalid stage "${stage}"`);

  const store = getStore(tenantId);
  const deal = store.deals.get(dealId);
  if (!deal) throw new Error(`Deal not found: ${dealId}`);
  assertTenantRecord(deal, tenantId);

  const updated: DealRecord = { ...deal, stage, updatedAt: nowIso() };
  store.deals.set(dealId, updated);
  return toDealWire(updated);
}

export function updateDealValue(
  tenantIdRaw: unknown,
  dealIdRaw: unknown,
  valueCentsRaw: unknown,
): DealRecordWire {
  const tenantId = requireTenantId(tenantIdRaw);
  const dealId = String(dealIdRaw ?? '').trim();
  if (!dealId) throw new Error('dealId is required');

  const store = getStore(tenantId);
  const deal = store.deals.get(dealId);
  if (!deal) throw new Error(`Deal not found: ${dealId}`);
  assertTenantRecord(deal, tenantId);

  const updated: DealRecord = {
    ...deal,
    valueCents: parseCentsInput(valueCentsRaw),
    updatedAt: nowIso(),
  };
  store.deals.set(dealId, updated);
  return toDealWire(updated);
}

export function logInteraction(
  tenantIdRaw: unknown,
  input: LogInteractionInput,
): InteractionLog {
  const tenantId = requireTenantId(tenantIdRaw);
  const store = getStore(tenantId);
  const summary = String(input.summary ?? '').trim();
  if (!summary) throw new Error('summary is required');

  const dealId = input.dealId ? String(input.dealId).trim() : null;
  const contactId = input.contactId ? String(input.contactId).trim() : null;
  if (dealId) {
    const deal = store.deals.get(dealId);
    if (!deal) throw new Error(`Deal not found: ${dealId}`);
    assertTenantRecord(deal, tenantId);
  }
  if (contactId) {
    const contact = store.contacts.get(contactId);
    if (!contact) throw new Error(`Contact not found: ${contactId}`);
    assertTenantRecord(contact, tenantId);
  }

  const stamp = nowIso();
  const log: InteractionLog = {
    id: randomUUID(),
    tenantId,
    dealId,
    contactId,
    channel: input.channel,
    summary,
    occurredAt: input.occurredAt?.trim() || stamp,
    createdAt: stamp,
  };
  store.interactions.set(log.id, log);
  return log;
}

export function createLeadBundle(
  tenantIdRaw: unknown,
  contactInput: CreateContactInput,
  dealInput: Omit<CreateDealInput, 'primaryContactId'>,
): { contact: B2BContact; deal: DealRecordWire } {
  const contact = createContact(tenantIdRaw, contactInput);
  const deal = createDeal(tenantIdRaw, { ...dealInput, primaryContactId: contact.id });
  return { contact, deal };
}

/** Test-only reset — not exported to Gemini tools. */
export function _resetCrmStoreForTests(): void {
  tenantStores.clear();
}
