/**
 * Ring-2 / partner-referral pilot telemetry — structured logs + contact metadata milestones.
 */

import type {
  AdjacentSector,
  BeachheadSector,
  B2BContact,
  LeadIngestionSource,
  LeadStage,
  QualificationSignals,
} from '../../types/crm.js';
import { isAdjacentSector, isCoreBeachheadSector } from '../../types/crm.js';
import {
  GRC_FIRST_ACTION_TYPES,
  PILOT_QUALITY_GATES,
  businessHoursBetween,
  countEvidenceFieldSlots,
  evidenceCompletenessPctFromSlots,
  evaluateConsecutiveGateBPass,
  evaluateGateBWeek,
  inferFirstActionType,
  isGrcAuditableFirstAction,
  isGrcFirstActionType,
  isIcpQualifiedConfirmed,
  isIcpQualifiedProxy,
  isoWeekKey,
  resolvePilotOperationalMode,
  type GateBWeekEvaluation,
  type GateBWeekMetrics,
  type GrcFirstActionType,
  type PilotOperationalMode,
  type QualificationLevel,
} from '../../../../lib/crm/pilotGates.js';

export {
  GRC_FIRST_ACTION_TYPES,
  PILOT_QUALITY_GATES,
  businessHoursBetween,
  evaluateConsecutiveGateBPass,
  evaluateGateBWeek,
  inferFirstActionType,
  isGrcAuditableFirstAction,
  isGrcFirstActionType,
  isIcpQualifiedProxy,
  isIcpQualifiedConfirmed,
  isoWeekKey,
  resolvePilotOperationalMode,
};
export type { GateBWeekEvaluation, GateBWeekMetrics, GrcFirstActionType, PilotOperationalMode, QualificationLevel };

export const DEFAULT_PILOT_COHORT = 'ring2-pilot-2026-07';

export type LeadMarketRing = 'CORE_BEACHHEAD' | 'RING_2' | 'UNCLASSIFIED' | 'UNKNOWN';

export type CrmPilotMilestone =
  | 'LEAD_INGESTED'
  | 'LEAD_QUALIFIED'
  | 'LEAD_QUALIFIED_CONFIRMED'
  | 'FIRST_ACTION'
  | 'COVERAGE_STARTED'
  | 'OUTCOME_MILESTONE';

export type CrmPilotMetadata = {
  cohort: string;
  ring: LeadMarketRing;
  ingestionSource: LeadIngestionSource;
  ingestedAt: string;
  qualificationLevel?: QualificationLevel;
  qualifiedAt?: string;
  icpConfirmedAt?: string;
  firstActionAt?: string;
  firstActionType?: GrcFirstActionType;
  firstActionBusinessHours?: number;
  coverageStartedAt?: string;
  outcomeMilestoneAt?: string;
  outcomeStage?: LeadStage;
  lastEvidenceCompletenessPct?: number;
  lastQualified?: boolean;
};

export type CrmPilotEvent = {
  milestone: CrmPilotMilestone;
  tenantId: string;
  contactId: string;
  ingestionSource: LeadIngestionSource;
  ring: LeadMarketRing;
  priorityScore: number;
  evidenceCompletenessPct: number;
  qualificationLevel: QualificationLevel;
  cohort: string;
  dealId?: string;
  dealStage?: LeadStage;
  channel?: string;
  firstActionType?: GrcFirstActionType;
  at: string;
};

const OUTCOME_STAGES = new Set<LeadStage>([
  'QUALIFIED',
  'DISCOVERY',
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST',
]);

export function classifyLeadRing(input: {
  industrySector?: BeachheadSector | null;
  adjacentSector?: AdjacentSector | null;
}): LeadMarketRing {
  if (input.industrySector && isCoreBeachheadSector(input.industrySector)) {
    return 'CORE_BEACHHEAD';
  }
  if (input.adjacentSector && isAdjacentSector(input.adjacentSector)) {
    return 'RING_2';
  }
  if (input.industrySector === 'UNCLASSIFIED') {
    return 'UNCLASSIFIED';
  }
  return 'UNKNOWN';
}

/** @deprecated Use isIcpQualifiedProxy */
export function isIcpQualified(priorityScore: number): boolean {
  return isIcpQualifiedProxy(priorityScore);
}

export function isOutcomeStage(stage: LeadStage): boolean {
  return OUTCOME_STAGES.has(stage);
}

export function resolveQualificationLevel(input: {
  priorityScore: number;
  industrySector?: BeachheadSector | null;
  adjacentSector?: AdjacentSector | null;
  detectedTrigger?: string | null;
  qualificationSignals?: QualificationSignals | null;
  icpConfirmed?: boolean;
}): QualificationLevel {
  const slots = countEvidenceFieldSlots({
    industrySector: input.industrySector,
    adjacentSector: input.adjacentSector,
    detectedTrigger: input.detectedTrigger,
    triggers: input.qualificationSignals?.triggers,
    painMarkers: input.qualificationSignals?.painMarkers,
    methodology: input.qualificationSignals?.methodology,
  });
  if (
    isIcpQualifiedConfirmed({
      priorityScore: input.priorityScore,
      evidenceFieldSlots: slots,
      icpConfirmed: input.icpConfirmed,
    })
  ) {
    return 'CONFIRMED';
  }
  if (isIcpQualifiedProxy(input.priorityScore)) return 'PROXY';
  return 'NONE';
}

export function computeEvidenceCompletenessPct(input: {
  industrySector?: BeachheadSector | null;
  adjacentSector?: AdjacentSector | null;
  detectedTrigger?: string | null;
  qualificationSignals?: QualificationSignals | null;
  hasDeal?: boolean;
  hasGrcFirstAction?: boolean;
}): number {
  const slots = countEvidenceFieldSlots({
    industrySector: input.industrySector,
    adjacentSector: input.adjacentSector,
    detectedTrigger: input.detectedTrigger,
    triggers: input.qualificationSignals?.triggers,
    painMarkers: input.qualificationSignals?.painMarkers,
    methodology: input.qualificationSignals?.methodology,
  });
  return evidenceCompletenessPctFromSlots(
    slots,
    Boolean(input.hasGrcFirstAction || input.hasDeal),
  );
}

export function parsePilotMetadata(raw: unknown): CrmPilotMetadata | null {
  if (!raw || typeof raw !== 'object') return null;
  const root = raw as Record<string, unknown>;
  const pilot = root.pilot;
  if (!pilot || typeof pilot !== 'object') return null;
  const p = pilot as Record<string, unknown>;
  if (typeof p.ingestedAt !== 'string' || typeof p.ring !== 'string') return null;
  return p as unknown as CrmPilotMetadata;
}

export function mergePilotMetadata(
  existingMetadata: unknown,
  patch: Partial<CrmPilotMetadata>,
): Record<string, unknown> {
  const base =
    existingMetadata && typeof existingMetadata === 'object'
      ? { ...(existingMetadata as Record<string, unknown>) }
      : {};
  const current = parsePilotMetadata(base) ?? {};
  return {
    ...base,
    pilot: {
      ...current,
      ...patch,
    },
  };
}

export function buildInitialPilotMetadata(input: {
  ingestionSource: LeadIngestionSource;
  industrySector?: BeachheadSector | null;
  adjacentSector?: AdjacentSector | null;
  ingestedAt?: string;
  cohort?: string;
}): Record<string, unknown> {
  const pilot: CrmPilotMetadata = {
    cohort: input.cohort ?? DEFAULT_PILOT_COHORT,
    ring: classifyLeadRing(input),
    ingestionSource: input.ingestionSource,
    ingestedAt: input.ingestedAt ?? new Date().toISOString(),
    qualificationLevel: 'NONE',
  };
  return { pilot };
}

export function buildPilotEvent(input: {
  milestone: CrmPilotMilestone;
  tenantId: string;
  contact: Pick<
    B2BContact,
    | 'id'
    | 'ingestionSource'
    | 'industrySector'
    | 'adjacentSector'
    | 'priorityScore'
    | 'detectedTrigger'
    | 'qualificationSignals'
  >;
  cohort?: string;
  icpConfirmed?: boolean;
  hasDeal?: boolean;
  hasGrcFirstAction?: boolean;
  dealId?: string;
  dealStage?: LeadStage;
  channel?: string;
  firstActionType?: GrcFirstActionType;
  at?: string;
}): CrmPilotEvent {
  const ring = classifyLeadRing(input.contact);
  const evidenceCompletenessPct = computeEvidenceCompletenessPct({
    industrySector: input.contact.industrySector,
    adjacentSector: input.contact.adjacentSector,
    detectedTrigger: input.contact.detectedTrigger,
    qualificationSignals: input.contact.qualificationSignals,
    hasDeal: input.hasDeal,
    hasGrcFirstAction: input.hasGrcFirstAction,
  });
  const qualificationLevel = resolveQualificationLevel({
    priorityScore: input.contact.priorityScore,
    industrySector: input.contact.industrySector,
    adjacentSector: input.contact.adjacentSector,
    detectedTrigger: input.contact.detectedTrigger,
    qualificationSignals: input.contact.qualificationSignals,
    icpConfirmed: input.icpConfirmed,
  });

  return {
    milestone: input.milestone,
    tenantId: input.tenantId,
    contactId: input.contact.id,
    ingestionSource: input.contact.ingestionSource,
    ring,
    priorityScore: input.contact.priorityScore,
    evidenceCompletenessPct,
    qualificationLevel,
    cohort: input.cohort ?? DEFAULT_PILOT_COHORT,
    ...(input.dealId ? { dealId: input.dealId } : {}),
    ...(input.dealStage ? { dealStage: input.dealStage } : {}),
    ...(input.channel ? { channel: input.channel } : {}),
    ...(input.firstActionType ? { firstActionType: input.firstActionType } : {}),
    at: input.at ?? new Date().toISOString(),
  };
}

export function emitCrmPilotEvent(event: CrmPilotEvent): void {
  if (process.env.CRM_PILOT_TRACKING_ENABLED === 'false') return;
  console.info(JSON.stringify({ type: 'CRM_PILOT_METRIC', ...event }));
}

export function pilotMetadataPatchForMilestone(
  milestone: CrmPilotMilestone,
  at: string,
  extras?: {
    outcomeStage?: LeadStage;
    evidenceCompletenessPct?: number;
    qualificationLevel?: QualificationLevel;
    firstActionType?: GrcFirstActionType;
    firstActionBusinessHours?: number;
    icpConfirmed?: boolean;
  },
): Partial<CrmPilotMetadata> {
  switch (milestone) {
    case 'LEAD_INGESTED':
      return { ingestedAt: at, qualificationLevel: 'NONE' };
    case 'LEAD_QUALIFIED':
      return {
        qualifiedAt: at,
        qualificationLevel: 'PROXY',
        lastQualified: true,
        ...(extras?.evidenceCompletenessPct !== undefined
          ? { lastEvidenceCompletenessPct: extras.evidenceCompletenessPct }
          : {}),
      };
    case 'LEAD_QUALIFIED_CONFIRMED':
      return {
        qualifiedAt: at,
        icpConfirmedAt: at,
        qualificationLevel: 'CONFIRMED',
        lastQualified: true,
        ...(extras?.evidenceCompletenessPct !== undefined
          ? { lastEvidenceCompletenessPct: extras.evidenceCompletenessPct }
          : {}),
      };
    case 'FIRST_ACTION':
      return {
        firstActionAt: at,
        ...(extras?.firstActionType ? { firstActionType: extras.firstActionType } : {}),
        ...(extras?.firstActionBusinessHours !== undefined
          ? { firstActionBusinessHours: extras.firstActionBusinessHours }
          : {}),
      };
    case 'COVERAGE_STARTED':
      return { coverageStartedAt: at };
    case 'OUTCOME_MILESTONE':
      return {
        outcomeMilestoneAt: at,
        ...(extras?.outcomeStage ? { outcomeStage: extras.outcomeStage } : {}),
      };
    default:
      return {};
  }
}

export type PartnerLeadRow = {
  createdAt: Date;
  priorityScore: number;
  industrySector: string | null;
  adjacentSector: string | null;
  detectedTrigger: string | null;
  qualificationSignals: unknown;
  metadata: unknown;
};

export function buildPartnerWeeklyGateEvaluations(
  contacts: PartnerLeadRow[],
  weekKeys: string[],
): GateBWeekEvaluation[] {
  return weekKeys.map((weekKey) => {
    const weekContacts = contacts.filter((c) => isoWeekKey(c.createdAt) === weekKey);
    const metrics: GateBWeekMetrics = {
      weekKey,
      ingested: 0,
      qualifiedProxy: 0,
      qualifiedConfirmed: 0,
      evidenceSum: 0,
      firstActionCount: 0,
      firstActionBusinessHours: [],
    };

    for (const contact of weekContacts) {
      metrics.ingested += 1;
      const signals =
        contact.qualificationSignals && typeof contact.qualificationSignals === 'object'
          ? (contact.qualificationSignals as QualificationSignals)
          : null;
      const pilot = parsePilotMetadata(contact.metadata);
      const slots = countEvidenceFieldSlots({
        industrySector: contact.industrySector,
        adjacentSector: contact.adjacentSector,
        detectedTrigger: contact.detectedTrigger,
        triggers: signals?.triggers,
        painMarkers: signals?.painMarkers,
        methodology: signals?.methodology,
      });
      const hasGrcFa = isGrcAuditableFirstAction(pilot?.firstActionType);
      const evidence = evidenceCompletenessPctFromSlots(slots, hasGrcFa);
      metrics.evidenceSum += evidence;

      if (isIcpQualifiedProxy(contact.priorityScore)) metrics.qualifiedProxy += 1;
      const confirmed =
        pilot?.qualificationLevel === 'CONFIRMED' ||
        isIcpQualifiedConfirmed({
          priorityScore: contact.priorityScore,
          evidenceFieldSlots: slots,
          icpConfirmed: Boolean(pilot?.icpConfirmedAt),
        });
      if (confirmed) metrics.qualifiedConfirmed += 1;

      if (confirmed && pilot?.firstActionAt && isGrcAuditableFirstAction(pilot.firstActionType)) {
        metrics.firstActionCount += 1;
        const bh =
          pilot.firstActionBusinessHours ??
          businessHoursBetween(contact.createdAt, pilot.firstActionAt);
        metrics.firstActionBusinessHours.push(bh);
      }
    }

    return evaluateGateBWeek(metrics);
  });
}
