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
import { requireTenantId, runIronboardCrmTransaction } from './crmTenantContext.js';

function nowIso(): string {
  return new Date().toISOString();
}

function mapContact(row: {
  id: string;
  tenantId: string;
  fullName: string;
  email: string;
  company: string;
  title: string;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}): B2BContact {
  return {
    id: row.id,
    tenantId: row.tenantId,
    fullName: row.fullName,
    email: row.email,
    company: row.company,
    title: row.title,
    phone: row.phone,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapDeal(row: {
  id: string;
  tenantId: string;
  title: string;
  stage: string;
  valueCents: bigint;
  primaryContactId: string;
  accountDomain: string | null;
  ownerAgentId: string | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}): DealRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    stage: row.stage as LeadStage,
    valueCents: row.valueCents,
    primaryContactId: row.primaryContactId,
    accountDomain: row.accountDomain,
    ownerAgentId: row.ownerAgentId,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapInteraction(row: {
  id: string;
  tenantId: string;
  dealId: string | null;
  contactId: string | null;
  channel: InteractionLog['channel'];
  summary: string;
  occurredAt: Date;
  createdAt: Date;
}): InteractionLog {
  return {
    id: row.id,
    tenantId: row.tenantId,
    dealId: row.dealId,
    contactId: row.contactId,
    channel: row.channel,
    summary: row.summary,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
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

function buildPipeline(
  tenantId: string,
  contacts: B2BContact[],
  deals: DealRecord[],
  interactions: InteractionLog[],
): DealPipeline {
  const sortedDeals = [...deals].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return {
    tenantId,
    deals: sortedDeals,
    contacts: [...contacts].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    interactions: [...interactions].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    forecastValueCents: sumForecastCents(sortedDeals),
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

function assertTenantRecord<T extends { tenantId: string }>(record: T, tenantId: string): T {
  if (record.tenantId !== tenantId) {
    throw new Error('Cross-tenant CRM access denied');
  }
  return record;
}

export async function listPipeline(tenantIdRaw: unknown): Promise<DealPipelineWire> {
  return runIronboardCrmTransaction(tenantIdRaw, async (tx, tenantId) => {
    const [contactRows, dealRows, interactionRows] = await Promise.all([
      tx.ironboardCrmContact.findMany({ where: { tenantId } }),
      tx.ironboardCrmDeal.findMany({ where: { tenantId } }),
      tx.ironboardCrmInteraction.findMany({ where: { tenantId } }),
    ]);
    return toPipelineWire(
      buildPipeline(
        tenantId,
        contactRows.map(mapContact),
        dealRows.map(mapDeal),
        interactionRows.map(mapInteraction),
      ),
    );
  });
}

export async function getDeal(tenantIdRaw: unknown, dealIdRaw: unknown): Promise<DealRecordWire> {
  return runIronboardCrmTransaction(tenantIdRaw, async (tx, tenantId) => {
    const dealId = String(dealIdRaw ?? '').trim();
    if (!dealId) throw new Error('dealId is required');
    const row = await tx.ironboardCrmDeal.findFirst({ where: { id: dealId, tenantId } });
    if (!row) throw new Error(`Deal not found: ${dealId}`);
    return toDealWire(assertTenantRecord(mapDeal(row), tenantId));
  });
}

export async function listContacts(tenantIdRaw: unknown): Promise<B2BContact[]> {
  return runIronboardCrmTransaction(tenantIdRaw, async (tx, tenantId) => {
    const rows = await tx.ironboardCrmContact.findMany({
      where: { tenantId },
      orderBy: { fullName: 'asc' },
    });
    return rows.map(mapContact);
  });
}

export async function createContact(
  tenantIdRaw: unknown,
  input: CreateContactInput,
): Promise<B2BContact> {
  return runIronboardCrmTransaction(tenantIdRaw, async (tx, tenantId) => {
    const fullName = String(input.fullName ?? '').trim();
    const email = String(input.email ?? '').trim();
    const company = String(input.company ?? '').trim();
    if (!fullName || !email || !company) {
      throw new Error('fullName, email, and company are required');
    }
    const row = await tx.ironboardCrmContact.create({
      data: {
        id: randomUUID(),
        tenantId,
        fullName,
        email,
        company,
        title: String(input.title ?? '').trim(),
        phone: input.phone ? String(input.phone).trim() : null,
      },
    });
    return mapContact(row);
  });
}

export async function createDeal(
  tenantIdRaw: unknown,
  input: CreateDealInput,
): Promise<DealRecordWire> {
  return runIronboardCrmTransaction(tenantIdRaw, async (tx, tenantId) => {
    const title = String(input.title ?? '').trim();
    const primaryContactId = String(input.primaryContactId ?? '').trim();
    if (!title || !primaryContactId) throw new Error('title and primaryContactId are required');

    const contact = await tx.ironboardCrmContact.findFirst({
      where: { id: primaryContactId, tenantId },
    });
    if (!contact) throw new Error(`Contact not found: ${primaryContactId}`);
    assertTenantRecord(mapContact(contact), tenantId);

    const stage: LeadStage = input.stage && isLeadStage(input.stage) ? input.stage : 'PROSPECT';
    const row = await tx.ironboardCrmDeal.create({
      data: {
        id: randomUUID(),
        tenantId,
        title,
        stage,
        valueCents: parseCentsInput(input.valueCents),
        primaryContactId,
        accountDomain: input.accountDomain ? String(input.accountDomain).trim() : null,
        ownerAgentId: input.ownerAgentId ? String(input.ownerAgentId).trim() : null,
        notes: String(input.notes ?? '').trim(),
      },
    });
    return toDealWire(mapDeal(row));
  });
}

export async function updateDealStage(
  tenantIdRaw: unknown,
  dealIdRaw: unknown,
  stageRaw: unknown,
): Promise<DealRecordWire> {
  return runIronboardCrmTransaction(tenantIdRaw, async (tx, tenantId) => {
    const dealId = String(dealIdRaw ?? '').trim();
    const stage = String(stageRaw ?? '').trim();
    if (!dealId) throw new Error('dealId is required');
    if (!isLeadStage(stage)) throw new Error(`Invalid stage "${stage}"`);

    const existing = await tx.ironboardCrmDeal.findFirst({ where: { id: dealId, tenantId } });
    if (!existing) throw new Error(`Deal not found: ${dealId}`);

    const row = await tx.ironboardCrmDeal.update({
      where: { id: dealId },
      data: { stage },
    });
    return toDealWire(assertTenantRecord(mapDeal(row), tenantId));
  });
}

export async function updateDealValue(
  tenantIdRaw: unknown,
  dealIdRaw: unknown,
  valueCentsRaw: unknown,
): Promise<DealRecordWire> {
  return runIronboardCrmTransaction(tenantIdRaw, async (tx, tenantId) => {
    const dealId = String(dealIdRaw ?? '').trim();
    if (!dealId) throw new Error('dealId is required');

    const existing = await tx.ironboardCrmDeal.findFirst({ where: { id: dealId, tenantId } });
    if (!existing) throw new Error(`Deal not found: ${dealId}`);

    const row = await tx.ironboardCrmDeal.update({
      where: { id: dealId },
      data: { valueCents: parseCentsInput(valueCentsRaw) },
    });
    return toDealWire(assertTenantRecord(mapDeal(row), tenantId));
  });
}

export async function logInteraction(
  tenantIdRaw: unknown,
  input: LogInteractionInput,
): Promise<InteractionLog> {
  return runIronboardCrmTransaction(tenantIdRaw, async (tx, tenantId) => {
    const summary = String(input.summary ?? '').trim();
    if (!summary) throw new Error('summary is required');

    const dealId = input.dealId ? String(input.dealId).trim() : null;
    const contactId = input.contactId ? String(input.contactId).trim() : null;

    if (dealId) {
      const deal = await tx.ironboardCrmDeal.findFirst({ where: { id: dealId, tenantId } });
      if (!deal) throw new Error(`Deal not found: ${dealId}`);
      assertTenantRecord(mapDeal(deal), tenantId);
    }
    if (contactId) {
      const contact = await tx.ironboardCrmContact.findFirst({
        where: { id: contactId, tenantId },
      });
      if (!contact) throw new Error(`Contact not found: ${contactId}`);
      assertTenantRecord(mapContact(contact), tenantId);
    }

    const stamp = nowIso();
    const row = await tx.ironboardCrmInteraction.create({
      data: {
        id: randomUUID(),
        tenantId,
        dealId,
        contactId,
        channel: input.channel,
        summary,
        occurredAt: new Date(input.occurredAt?.trim() || stamp),
      },
    });
    return mapInteraction(row);
  });
}

export async function createLeadBundle(
  tenantIdRaw: unknown,
  contactInput: CreateContactInput,
  dealInput: Omit<CreateDealInput, 'primaryContactId'>,
): Promise<{ contact: B2BContact; deal: DealRecordWire }> {
  return runIronboardCrmTransaction(tenantIdRaw, async (tx, tenantId) => {
    const fullName = String(contactInput.fullName ?? '').trim();
    const email = String(contactInput.email ?? '').trim();
    const company = String(contactInput.company ?? '').trim();
    if (!fullName || !email || !company) {
      throw new Error('fullName, email, and company are required');
    }

    const contactRow = await tx.ironboardCrmContact.create({
      data: {
        id: randomUUID(),
        tenantId,
        fullName,
        email,
        company,
        title: String(contactInput.title ?? '').trim(),
        phone: contactInput.phone ? String(contactInput.phone).trim() : null,
      },
    });

    const title = String(dealInput.title ?? '').trim();
    if (!title) throw new Error('title is required');
    const stage: LeadStage =
      dealInput.stage && isLeadStage(dealInput.stage) ? dealInput.stage : 'PROSPECT';

    const dealRow = await tx.ironboardCrmDeal.create({
      data: {
        id: randomUUID(),
        tenantId,
        title,
        stage,
        valueCents: parseCentsInput(dealInput.valueCents),
        primaryContactId: contactRow.id,
        accountDomain: dealInput.accountDomain ? String(dealInput.accountDomain).trim() : null,
        ownerAgentId: dealInput.ownerAgentId ? String(dealInput.ownerAgentId).trim() : null,
        notes: String(dealInput.notes ?? '').trim(),
      },
    });

    return {
      contact: mapContact(contactRow),
      deal: toDealWire(mapDeal(dealRow)),
    };
  });
}

/** Test-only reset — clears CRM rows for a tenant inside an Ironguard-bound transaction. */
export async function _resetCrmStoreForTests(tenantIdRaw: unknown): Promise<void> {
  await runIronboardCrmTransaction(tenantIdRaw, async (tx, tenantId) => {
    await tx.ironboardCrmInteraction.deleteMany({ where: { tenantId } });
    await tx.ironboardCrmDeal.deleteMany({ where: { tenantId } });
    await tx.ironboardCrmContact.deleteMany({ where: { tenantId } });
  });
}

export { requireTenantId };
