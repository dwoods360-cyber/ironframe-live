import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type {
  B2BContact,
  BeachheadSector,
  CreateContactInput,
  CreateDealInput,
  DealPipeline,
  DealPipelineWire,
  DealRecord,
  DealRecordWire,
  InteractionLog,
  IronleadsIngressInput,
  LeadIngestionSource,
  LeadStage,
  LogInteractionInput,
  PrioritizedLeadsWire,
  QualificationSignals,
  UpdateQualificationInput,
} from '../../types/crm.js';
import {
  centsToWire,
  isAdjacentSector,
  isBeachheadSector,
  isLeadIngestionSource,
  isLeadStage,
  parseCentsInput,
} from '../../types/crm.js';
import {
  classifyVulnerability,
  computeQualificationScores,
  isTriggerSignal as isTriggerSignalCore,
  priorityScoreFromSignals,
  type QualificationInput,
  type TriggerSignal,
} from './leadPrioritization.js';
import { requireTenantId, runIronboardCrmTransaction } from './crmTenantContext.js';
import {
  buildInitialPilotMetadata,
  buildPartnerWeeklyGateEvaluations,
  buildPilotEvent,
  businessHoursBetween,
  computeEvidenceCompletenessPct,
  emitCrmPilotEvent,
  inferFirstActionType,
  isGrcAuditableFirstAction,
  isIcpQualifiedProxy,
  isOutcomeStage,
  isoWeekKey,
  mergePilotMetadata,
  parsePilotMetadata,
  pilotMetadataPatchForMilestone,
  resolvePilotOperationalMode,
  resolveQualificationLevel,
  evaluateConsecutiveGateBPass,
  type CrmPilotMilestone,
  type PartnerLeadRow,
} from './crmPilotTracking.js';

function nowIso(): string {
  return new Date().toISOString();
}

function sanitizeText(raw: unknown, maxLen: number): string {
  return String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '[STRIPPED]')
    .trim()
    .slice(0, maxLen);
}

function parseQualificationSignalsJson(raw: unknown): QualificationSignals {
  if (!raw || typeof raw !== 'object') {
    return computeQualificationScores({});
  }
  const obj = raw as Partial<QualificationSignals>;
  if (
    typeof obj.beachheadScore === 'number' &&
    typeof obj.priorityWeight === 'number' &&
    typeof obj.computedAt === 'string'
  ) {
    return obj as QualificationSignals;
  }
  return computeQualificationScores({});
}

function qualificationInputFromCreate(input: CreateContactInput): QualificationInput {
  const triggers = (input.triggers ?? []).filter(isTriggerSignalCore);
  return {
    industrySector: input.industrySector ?? null,
    adjacentSector: input.adjacentSector ?? null,
    detectedTrigger: input.detectedTrigger ?? null,
    painMarkers: input.painMarkers,
    triggers,
    methodology: input.methodology,
  };
}

function mapContact(row: {
  id: string;
  tenantId: string;
  fullName: string;
  email: string;
  company: string;
  title: string;
  phone: string | null;
  industrySector?: string | null;
  adjacentSector?: string | null;
  detectedTrigger?: string | null;
  ingestionSource?: string;
  priorityScore?: number;
  qualificationSignals?: unknown;
  createdAt: Date;
  updatedAt: Date;
}): B2BContact {
  const qualificationSignals = parseQualificationSignalsJson(row.qualificationSignals);
  return {
    id: row.id,
    tenantId: row.tenantId,
    fullName: row.fullName,
    email: row.email,
    company: row.company,
    title: row.title,
    phone: row.phone,
    industrySector:
      row.industrySector && isBeachheadSector(row.industrySector) ? row.industrySector : null,
    adjacentSector:
      row.adjacentSector && isAdjacentSector(row.adjacentSector) ? row.adjacentSector : null,
    detectedTrigger: row.detectedTrigger ?? null,
    ingestionSource:
      row.ingestionSource && isLeadIngestionSource(row.ingestionSource)
        ? row.ingestionSource
        : 'MANUAL_INPUT',
    priorityScore: row.priorityScore ?? priorityScoreFromSignals(qualificationSignals),
    qualificationSignals,
    vulnerabilityClass: classifyVulnerability(qualificationSignals),
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
    if (deal.stage !== 'CLOSED_LOST' && deal.stage !== 'SUSPECT') total += deal.valueCents;
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
    contacts: [...contacts].sort((a, b) => b.priorityScore - a.priorityScore || a.fullName.localeCompare(b.fullName)),
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

function contactCreateData(tenantId: string, input: CreateContactInput) {
  const qualification = computeQualificationScores(qualificationInputFromCreate(input));
  const priorityScore = priorityScoreFromSignals(qualification);
  const ingestionSource: LeadIngestionSource =
    input.ingestionSource && isLeadIngestionSource(input.ingestionSource)
      ? input.ingestionSource
      : 'MANUAL_INPUT';

  return {
    id: randomUUID(),
    tenantId,
    fullName: sanitizeText(input.fullName, 200),
    email: sanitizeText(input.email, 320).toLowerCase(),
    company: sanitizeText(input.company, 200),
    title: sanitizeText(input.title ?? '', 200),
    phone: input.phone ? sanitizeText(input.phone, 40) : null,
    industrySector: input.industrySector ?? null,
    adjacentSector: input.adjacentSector ?? null,
    detectedTrigger: input.detectedTrigger ? sanitizeText(input.detectedTrigger, 120) : null,
    ingestionSource,
    priorityScore,
    qualificationSignals: qualification,
    metadata: buildInitialPilotMetadata({
      ingestionSource,
      industrySector: input.industrySector ?? null,
      adjacentSector: input.adjacentSector ?? null,
    }),
  };
}

type CrmTx = Prisma.TransactionClient;

async function trackPilotMilestoneIfNew(
  tx: CrmTx,
  tenantId: string,
  contactId: string,
  milestone: CrmPilotMilestone,
  options?: {
    dealId?: string;
    dealStage?: LeadStage;
    channel?: string;
    hasDeal?: boolean;
    hasGrcFirstAction?: boolean;
    forceQualified?: boolean;
    icpConfirmed?: boolean;
    firstActionType?: import('../../types/crm.js').GrcFirstActionType;
    ingestedAt?: string;
  },
): Promise<void> {
  const row = await tx.ironboardCrmContact.findFirst({ where: { id: contactId, tenantId } });
  if (!row) return;

  const pilot = parsePilotMetadata(row.metadata);
  const skipKeys: Partial<Record<CrmPilotMilestone, keyof NonNullable<typeof pilot>>> = {
    LEAD_QUALIFIED: 'qualifiedAt',
    LEAD_QUALIFIED_CONFIRMED: 'icpConfirmedAt',
    FIRST_ACTION: 'firstActionAt',
    COVERAGE_STARTED: 'coverageStartedAt',
    OUTCOME_MILESTONE: 'outcomeMilestoneAt',
  };
  const skipKey = skipKeys[milestone];
  if (skipKey && pilot?.[skipKey]) return;

  if (milestone === 'LEAD_QUALIFIED' && !options?.forceQualified) return;
  if (milestone === 'LEAD_QUALIFIED_CONFIRMED' && !options?.icpConfirmed && !options?.forceQualified) {
    return;
  }

  const contact = mapContact(row);
  const at = nowIso();
  const evidenceCompletenessPct = computeEvidenceCompletenessPct({
    industrySector: contact.industrySector,
    adjacentSector: contact.adjacentSector,
    detectedTrigger: contact.detectedTrigger,
    qualificationSignals: contact.qualificationSignals,
    hasDeal: options?.hasDeal,
    hasGrcFirstAction: options?.hasGrcFirstAction,
  });

  const firstActionBusinessHours =
    milestone === 'FIRST_ACTION' && options?.ingestedAt
      ? businessHoursBetween(options.ingestedAt, at)
      : undefined;

  await tx.ironboardCrmContact.update({
    where: { id: contactId },
    data: {
      metadata: mergePilotMetadata(row.metadata, {
        ...pilotMetadataPatchForMilestone(milestone, at, {
          outcomeStage: options?.dealStage,
          evidenceCompletenessPct,
          qualificationLevel:
            milestone === 'LEAD_QUALIFIED_CONFIRMED'
              ? 'CONFIRMED'
              : milestone === 'LEAD_QUALIFIED'
                ? 'PROXY'
                : undefined,
          firstActionType: options?.firstActionType,
          firstActionBusinessHours,
          icpConfirmed: options?.icpConfirmed,
        }),
        lastEvidenceCompletenessPct: evidenceCompletenessPct,
      }),
    },
  });

  emitCrmPilotEvent(
    buildPilotEvent({
      milestone,
      tenantId,
      contact,
      icpConfirmed: options?.icpConfirmed,
      hasDeal: options?.hasDeal,
      hasGrcFirstAction: options?.hasGrcFirstAction,
      dealId: options?.dealId,
      dealStage: options?.dealStage,
      channel: options?.channel,
      firstActionType: options?.firstActionType,
      cohort: pilot?.cohort,
      at,
    }),
  );
}

function emitLeadIngested(tenantId: string, contact: B2BContact): void {
  emitCrmPilotEvent(
    buildPilotEvent({
      milestone: 'LEAD_INGESTED',
      tenantId,
      contact,
    }),
  );
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

export async function listPrioritizedLeads(
  tenantIdRaw: unknown,
  limitRaw?: unknown,
): Promise<PrioritizedLeadsWire> {
  return runIronboardCrmTransaction(tenantIdRaw, async (tx, tenantId) => {
    const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 100);
    const rows = await tx.ironboardCrmContact.findMany({
      where: { tenantId },
      orderBy: [{ priorityScore: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
    });

    const partnerRows: PartnerLeadRow[] = await tx.ironboardCrmContact.findMany({
      where: { tenantId, ingestionSource: 'PARTNER_REFERRAL' },
      select: {
        createdAt: true,
        priorityScore: true,
        industrySector: true,
        adjacentSector: true,
        detectedTrigger: true,
        qualificationSignals: true,
        metadata: true,
      },
    });

    const weekKeys: string[] = [
      ...new Set(partnerRows.map((row) => isoWeekKey(row.createdAt))),
    ].sort();
    const recentWeeks = weekKeys.slice(-4);
    const weeklyEvals = buildPartnerWeeklyGateEvaluations(partnerRows, recentWeeks);
    const { pass: gateBPass, consecutiveWeeks } = evaluateConsecutiveGateBPass(weeklyEvals);
    const operationalMode = resolvePilotOperationalMode({
      gateAReady: true,
      consecutiveGateBPass: gateBPass,
      totalPartnerLeads: partnerRows.length,
    });

    return {
      tenantId,
      contacts: rows.map(mapContact),
      updatedAt: nowIso(),
      pilot: {
        operationalMode,
        gateBPass,
        gateBConsecutiveWeeks: consecutiveWeeks,
        guidance:
          operationalMode === 'OPERATIONAL_SCALE'
            ? 'Ring-2 partner referrals may drive outreach prioritization and agent playbooks.'
            : 'Ring-2 scoring is sort-only — prioritize in list_prioritized_leads without auto-outreach until Gate B passes 2 consecutive weeks.',
      },
    };
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
      orderBy: [{ priorityScore: 'desc' }, { fullName: 'asc' }],
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
      data: contactCreateData(tenantId, input),
    });
    const contact = mapContact(row);
    emitLeadIngested(tenantId, contact);
    return contact;
  });
}

export async function updateContactQualification(
  tenantIdRaw: unknown,
  input: UpdateQualificationInput,
): Promise<B2BContact> {
  return runIronboardCrmTransaction(tenantIdRaw, async (tx, tenantId) => {
    const contactId = String(input.contactId ?? '').trim();
    if (!contactId) throw new Error('contactId is required');

    const existing = await tx.ironboardCrmContact.findFirst({ where: { id: contactId, tenantId } });
    if (!existing) throw new Error(`Contact not found: ${contactId}`);

    const triggers = (input.triggers ?? []).filter(isTriggerSignalCore);
    const resolvedIndustrySector =
      input.industrySector !== undefined
        ? input.industrySector
        : existing.industrySector && isBeachheadSector(existing.industrySector)
          ? existing.industrySector
          : null;
    const resolvedAdjacentSector =
      input.adjacentSector !== undefined
        ? input.adjacentSector
        : existing.adjacentSector && isAdjacentSector(existing.adjacentSector)
          ? existing.adjacentSector
          : null;

    const qualification = computeQualificationScores({
      industrySector: resolvedIndustrySector,
      adjacentSector: resolvedAdjacentSector,
      detectedTrigger:
        input.detectedTrigger !== undefined ? input.detectedTrigger : existing.detectedTrigger,
      painMarkers: input.painMarkers,
      triggers,
      methodology: input.methodology,
    });

    const wasQualifiedProxy = isIcpQualifiedProxy(existing.priorityScore);
    const priorPilot = parsePilotMetadata(existing.metadata);

    const row = await tx.ironboardCrmContact.update({
      where: { id: contactId },
      data: {
        industrySector:
          input.industrySector !== undefined ? input.industrySector : existing.industrySector,
        adjacentSector:
          input.adjacentSector !== undefined ? input.adjacentSector : existing.adjacentSector,
        detectedTrigger:
          input.detectedTrigger !== undefined
            ? input.detectedTrigger
              ? sanitizeText(input.detectedTrigger, 120)
              : null
            : existing.detectedTrigger,
        priorityScore: priorityScoreFromSignals(qualification),
        qualificationSignals: qualification,
        metadata: mergePilotMetadata(existing.metadata, {
          lastEvidenceCompletenessPct: computeEvidenceCompletenessPct({
            industrySector:
              input.industrySector !== undefined
                ? input.industrySector
                : existing.industrySector && isBeachheadSector(existing.industrySector)
                  ? existing.industrySector
                  : null,
            adjacentSector: resolvedAdjacentSector,
            detectedTrigger:
              input.detectedTrigger !== undefined
                ? input.detectedTrigger
                : existing.detectedTrigger,
            qualificationSignals: qualification,
          }),
          ...(input.icpConfirmed ? { qualificationLevel: 'CONFIRMED' as const } : {}),
        }),
      },
    });
    const contact = mapContact(assertTenantRecord(row, tenantId));
    const qualLevel = resolveQualificationLevel({
      priorityScore: contact.priorityScore,
      industrySector: contact.industrySector,
      adjacentSector: contact.adjacentSector,
      detectedTrigger: contact.detectedTrigger,
      qualificationSignals: contact.qualificationSignals,
      icpConfirmed: input.icpConfirmed,
    });

    const nowQualifiedProxy = isIcpQualifiedProxy(contact.priorityScore);
    if (nowQualifiedProxy && !wasQualifiedProxy) {
      await trackPilotMilestoneIfNew(tx, tenantId, contactId, 'LEAD_QUALIFIED', {
        forceQualified: true,
      });
    }
    if (
      qualLevel === 'CONFIRMED' &&
      priorPilot?.qualificationLevel !== 'CONFIRMED' &&
      !priorPilot?.icpConfirmedAt
    ) {
      await trackPilotMilestoneIfNew(tx, tenantId, contactId, 'LEAD_QUALIFIED_CONFIRMED', {
        forceQualified: true,
        icpConfirmed: input.icpConfirmed ?? true,
      });
    }
    return contact;
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
    await trackPilotMilestoneIfNew(tx, tenantId, primaryContactId, 'COVERAGE_STARTED', {
      dealId: row.id,
      dealStage: stage,
      hasDeal: true,
    });
    if (isOutcomeStage(stage)) {
      await trackPilotMilestoneIfNew(tx, tenantId, primaryContactId, 'OUTCOME_MILESTONE', {
        dealId: row.id,
        dealStage: stage,
        hasDeal: true,
      });
    }
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
    const deal = assertTenantRecord(mapDeal(row), tenantId);
    if (isOutcomeStage(stage)) {
      await trackPilotMilestoneIfNew(tx, tenantId, existing.primaryContactId, 'OUTCOME_MILESTONE', {
        dealId: deal.id,
        dealStage: stage,
        hasDeal: true,
      });
    }
    return toDealWire(deal);
  });
}

export async function promoteSuspectDeal(
  tenantIdRaw: unknown,
  dealIdRaw: unknown,
): Promise<DealRecordWire> {
  return updateDealStage(tenantIdRaw, dealIdRaw, 'PROSPECT');
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

    const resolvedContactId =
      contactId ??
      (dealId
        ? (
            await tx.ironboardCrmDeal.findFirst({
              where: { id: dealId, tenantId },
              select: { primaryContactId: true },
            })
          )?.primaryContactId
        : null);

    if (resolvedContactId) {
      const contactRow = await tx.ironboardCrmContact.findFirst({
        where: { id: resolvedContactId, tenantId },
      });
      const firstActionType = inferFirstActionType(
        summary,
        input.firstActionType ?? null,
      );
      const pilot = contactRow ? parsePilotMetadata(contactRow.metadata) : null;
      if (isGrcAuditableFirstAction(firstActionType)) {
        await trackPilotMilestoneIfNew(tx, tenantId, resolvedContactId, 'FIRST_ACTION', {
          dealId: dealId ?? undefined,
          channel: input.channel,
          hasGrcFirstAction: true,
          firstActionType,
          ingestedAt: pilot?.ingestedAt ?? contactRow?.createdAt.toISOString(),
        });
        await trackPilotMilestoneIfNew(tx, tenantId, resolvedContactId, 'COVERAGE_STARTED', {
          dealId: dealId ?? undefined,
          channel: input.channel,
          hasGrcFirstAction: true,
          firstActionType,
        });
      }
    }

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
      data: contactCreateData(tenantId, contactInput),
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

    const contact = mapContact(contactRow);
    emitLeadIngested(tenantId, contact);
    await trackPilotMilestoneIfNew(tx, tenantId, contactRow.id, 'COVERAGE_STARTED', {
      dealId: dealRow.id,
      dealStage: stage,
      hasDeal: true,
    });
    if (isIcpQualifiedProxy(contact.priorityScore)) {
      await trackPilotMilestoneIfNew(tx, tenantId, contactRow.id, 'LEAD_QUALIFIED', {
        forceQualified: true,
      });
    }
    const qualLevel = resolveQualificationLevel({
      priorityScore: contact.priorityScore,
      industrySector: contact.industrySector,
      adjacentSector: contact.adjacentSector,
      detectedTrigger: contact.detectedTrigger,
      qualificationSignals: contact.qualificationSignals,
    });
    if (qualLevel === 'CONFIRMED') {
      await trackPilotMilestoneIfNew(tx, tenantId, contactRow.id, 'LEAD_QUALIFIED_CONFIRMED', {
        forceQualified: true,
      });
    }

    return {
      contact,
      deal: toDealWire(mapDeal(dealRow)),
    };
  });
}

/**
 * Irongate perimeter ingress for Ironleads — creates SUSPECT-stage contact + deal.
 * Crawled leads stay in suspect queue until promoted via promote_suspect_deal.
 */
export async function ingestIronleadsLead(
  input: IronleadsIngressInput,
): Promise<{ contact: B2BContact; deal: DealRecordWire; tenantId: string }> {
  const { getPrisma } = await import('../prisma.js');
  const prisma = getPrisma();

  const tenant = await prisma.tenant.findUnique({
    where: { slug: sanitizeText(input.targetTenantSlug, 63) },
    select: { id: true },
  });
  if (!tenant) throw new Error(`TARGET_TENANT_NOT_FOUND: ${input.targetTenantSlug}`);

  const companyName = sanitizeText(input.companyName, 255);
  if (!companyName || companyName.length < 2) throw new Error('companyName is required');

  if (!isBeachheadSector(input.industrySector)) {
    throw new Error(`Invalid industrySector "${input.industrySector}"`);
  }

  const detectedTrigger = sanitizeText(input.detectedTrigger, 120);
  if (!detectedTrigger || detectedTrigger.length < 2) throw new Error('detectedTrigger is required');

  const contactEmail = input.contactEmail
    ? sanitizeText(input.contactEmail, 320).toLowerCase()
    : `suspect+${randomUUID().slice(0, 8)}@ironleads.local`;

  const contactName = sanitizeText(input.contactName ?? 'Ironleads Prospect', 200);

  const triggers = detectedTrigger
    .split(/[,|]/)
    .map((part) => part.trim().toUpperCase())
    .filter((part): part is TriggerSignal => isTriggerSignalCore(part));

  return createLeadBundle(
    tenant.id,
    {
      fullName: contactName,
      email: contactEmail,
      company: companyName,
      title: 'Suspect — autonomous harvest',
      industrySector: input.industrySector,
      detectedTrigger,
      ingestionSource: 'AUTONOMOUS_CRAWLER',
      triggers,
      painMarkers: {
        fragmentedGrc: true,
      },
    },
    {
      title: `${companyName} — OSINT suspect`,
      stage: 'SUSPECT',
      valueCents: '0',
      accountDomain: input.accountDomain ? sanitizeText(input.accountDomain, 255) : null,
      notes: `Ironleads ingress | trigger=${detectedTrigger}`,
    },
  ).then((bundle) => ({ ...bundle, tenantId: tenant.id }));
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

// Re-export scoring for board tooling
export {
  computeQualificationScores,
  priorityScoreFromSignals,
  classifyVulnerability,
} from './leadPrioritization.js';
