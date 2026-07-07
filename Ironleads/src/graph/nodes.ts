import { runLeadGatekeeper } from '../agents/leadGatekeeper.js';
import { runLeadScout } from '../agents/leadScout.js';
import { runSignalFilter } from '../agents/signalFilter.js';
import {
  classifyVulnerability,
  computeQualificationScores,
  isBeachheadSector,
  priorityScoreFromSignals,
} from '../lib/leadScoring.js';
import { listLeadGenByTrigger, searchLeadGenKnowledge } from '../knowledge/index.js';
import { getIronleadsPrisma } from '../lib/prisma.js';
import { fingerprintParserSuccess, LKG_PARSER_SUCCESS } from './lkg.js';
import type { IronleadsGraphState, ParsedLeadRecord, QuarantineRecord, ScoredLeadRecord, StrategizedLeadRecord } from './state.js';

type NodeState = Partial<IronleadsGraphState>;

function logStep(message: string): { pipelineLog: string[] } {
  return { pipelineLog: [message] };
}

/** L-01 — fetch allowlisted OSINT into SQLite scratchpad. */
export async function leadScoutNode(state: NodeState): Promise<Partial<IronleadsGraphState>> {
  const sourceIds = state.sourceIds?.length ? state.sourceIds : undefined;
  const scout = await runLeadScout(sourceIds);
  const stored = scout.filter(row => row.stored).length;
  return {
    scoutResults: scout,
    ...logStep(`[scout] fetched ${scout.length} sources; stored ${stored} new signals`),
  };
}

/** L-02 — deterministic parse + qualify raw signals. */
export async function leadParserNode(state: NodeState): Promise<Partial<IronleadsGraphState>> {
  if (state.scoutOnly) {
    return logStep('[parser] skipped — scoutOnly mode');
  }

  const parser = await runSignalFilter();
  const prisma = getIronleadsPrisma();
  const qualifiedIds = parser.filter(row => row.qualified && row.qualifiedLeadId).map(row => row.qualifiedLeadId!);

  const parsedLeads: ParsedLeadRecord[] = [];
  if (qualifiedIds.length > 0) {
    const rows = await prisma.qualifiedLead.findMany({
      where: { id: { in: qualifiedIds } },
    });
    for (const row of rows) {
      parsedLeads.push({
        qualifiedLeadId: row.id,
        signalId: row.signalId,
        companyName: row.companyName,
        industrySector: row.industrySector,
        detectedTrigger: row.detectedTrigger,
        confidenceScore: row.confidenceScore,
        accountDomain: row.accountDomain,
      });
    }
  }

  return {
    parserResults: parser,
    parsedLeads,
    lastKnownGoodNode: LKG_PARSER_SUCCESS,
    stateFingerprint: fingerprintParserSuccess({
      ...state,
      parserResults: parser,
      parsedLeads,
    }),
    ...logStep(`[parser] qualified ${parsedLeads.length} leads; committed ${LKG_PARSER_SUCCESS}`),
  };
}

/** L-03 — apply GTM priority scoring (beachhead × pain × trigger × methodology weights). */
export async function leadScorerNode(state: NodeState): Promise<Partial<IronleadsGraphState>> {
  if (state.scoutOnly) {
    return logStep('[scorer] skipped — scoutOnly mode');
  }
  if (state.injectScorerFailure) {
    throw new TypeError('scoring engine received unhandled data type');
  }

  const scoredLeads: ScoredLeadRecord[] = [];

  for (const lead of state.parsedLeads ?? []) {
    const sector = isBeachheadSector(lead.industrySector) ? lead.industrySector : null;
    const triggers = lead.detectedTrigger
      .split(/[,|]/)
      .map(part => part.trim())
      .filter(Boolean);

    const signals = computeQualificationScores({
      industrySector: sector,
      detectedTrigger: lead.detectedTrigger,
      triggers: triggers as never[],
      painMarkers: {
        fragmentedGrc: true,
        manualBoardReporting: triggers.includes('REG_FINE') || triggers.includes('BOARD_MANDATE_DOLLAR_RISK'),
        noDollarRiskQuant: triggers.includes('BOARD_MANDATE_DOLLAR_RISK'),
      },
      methodology: {
        commercialInsightDelivered: false,
        spinSituationReduced: false,
      },
    });

    const priorityScore = priorityScoreFromSignals(signals);
    const vulnerabilityClass = classifyVulnerability(signals);

    scoredLeads.push({
      ...lead,
      priorityScore,
      vulnerabilityClass,
    });
  }

  scoredLeads.sort((a, b) => b.priorityScore - a.priorityScore);

  return {
    scoredLeads,
    ...logStep(`[scorer] ranked ${scoredLeads.length} leads by priority vector`),
  };
}

function pickStrategyEntry(lead: ScoredLeadRecord) {
  const triggers = lead.detectedTrigger.split(/[,|]/).map(part => part.trim());
  for (const trigger of triggers) {
    const byTrigger = listLeadGenByTrigger(trigger as never);
    if (byTrigger.length > 0) {
      return byTrigger[0];
    }
  }
  const bySector = searchLeadGenKnowledge(lead.industrySector);
  if (bySector.length > 0) return bySector[0];
  return searchLeadGenKnowledge('trigger event')[0];
}

/** L-04 — attach lead-gen playbook tactics from Ironleads knowledge corpus. */
export async function leadStrategistNode(state: NodeState): Promise<Partial<IronleadsGraphState>> {
  if (state.scoutOnly) {
    return logStep('[strategist] skipped — scoutOnly mode');
  }

  const strategist: StrategizedLeadRecord[] = (state.scoredLeads ?? []).map(lead => {
    const entry = pickStrategyEntry(lead);
    return {
      ...lead,
      knowledgeEntryId: entry?.id ?? 'trigger_event_selling',
      knowledgeTitle: entry?.title ?? 'Trigger Event Selling',
      recommendedTactics: [...(entry?.keyTactics ?? []).slice(0, 4)],
      discoveryQuestions: [...(entry?.discoveryQuestions ?? []).slice(0, 3)],
    };
  });

  return {
    strategistResults: strategist,
    ...logStep(`[strategist] armed ${strategist.length} leads with corpus tactics`),
  };
}

/** L-05 — marshal sanitized payloads to Irongate ingress (SUSPECT queue). */
export async function leadMarshalNode(state: NodeState): Promise<Partial<IronleadsGraphState>> {
  if (state.scoutOnly) {
    return logStep('[marshal] skipped — scoutOnly mode');
  }
  if (state.skipIngress) {
    return logStep('[marshal] skipped — skipIngress flag');
  }

  const marshal = await runLeadGatekeeper();
  const shipped = marshal.filter(row => row.shipped).length;
  return {
    marshalResults: marshal,
    ...logStep(`[marshal] shipped ${shipped} leads to Ironframe ingress`),
  };
}

/** DLQ — park uncorrupted parser output for human review after downstream failure. */
export async function quarantineDlqNode(
  state: NodeState,
): Promise<Partial<IronleadsGraphState>> {
  const prisma = getIronleadsPrisma();
  const failedNode = state.failedNode ?? 'downstream';
  const reason = state.lastError ?? state.error ?? 'unknown failure';
  const fingerprint = state.stateFingerprint ?? null;
  const leads = state.parsedLeads ?? [];

  const quarantineDlq: QuarantineRecord[] = [];

  for (const lead of leads) {
    await prisma.quarantineLead.create({
      data: {
        threadId: state.runId ?? 'unknown',
        runId: state.runId,
        failedNode,
        errorMessage: reason,
        stateFingerprint: fingerprint,
        payloadJson: JSON.stringify(lead),
        companyName: lead.companyName,
        signalId: lead.signalId,
        qualifiedLeadId: lead.qualifiedLeadId,
      },
    });
    quarantineDlq.push({
      qualifiedLeadId: lead.qualifiedLeadId,
      companyName: lead.companyName,
      signalId: lead.signalId,
      reason,
      failedNode,
      stateFingerprint: fingerprint,
    });
  }

  return {
    quarantineDlq,
    threadFrozen: false,
    skipIngress: true,
    ...logStep(`[quarantine_dlq] parked ${quarantineDlq.length} leads for human review`),
  };
}
