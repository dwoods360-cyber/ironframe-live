import { Annotation } from '@langchain/langgraph';

import type { LeadGatekeeperResult } from '../agents/leadGatekeeper.js';
import type { LeadScoutResult } from '../agents/leadScout.js';
import type { SignalFilterResult } from '../agents/signalFilter.js';

export type ParsedLeadRecord = {
  qualifiedLeadId: string;
  signalId: string;
  companyName: string;
  industrySector: string;
  detectedTrigger: string;
  confidenceScore: number;
  accountDomain?: string | null;
};

export type ScoredLeadRecord = ParsedLeadRecord & {
  priorityScore: number;
  vulnerabilityClass: 'HIGH' | 'MEDIUM' | 'LOW';
};

export type StrategizedLeadRecord = ScoredLeadRecord & {
  knowledgeEntryId: string;
  knowledgeTitle: string;
  recommendedTactics: string[];
  discoveryQuestions: string[];
};

export type QuarantineRecord = {
  qualifiedLeadId: string;
  companyName: string;
  signalId: string;
  reason: string;
  failedNode: string;
  stateFingerprint: string | null;
};

export type IronleadsPipelineInput = {
  sourceIds?: string[];
  scoutOnly?: boolean;
  skipIngress?: boolean;
  /** LangGraph checkpoint thread — defaults to a new UUID per harvest. */
  threadId?: string;
  /** Resume from the last checkpoint for `threadId` instead of starting fresh. */
  resume?: boolean;
  /** Test hook — forces scorer failure to exercise LKG recovery. */
  injectScorerFailure?: boolean;
};

export type IronleadsGraphState = {
  sourceIds: string[];
  scoutOnly: boolean;
  skipIngress: boolean;
  runId: string | null;
  scoutResults: LeadScoutResult[];
  parserResults: SignalFilterResult[];
  parsedLeads: ParsedLeadRecord[];
  scoredLeads: ScoredLeadRecord[];
  strategistResults: StrategizedLeadRecord[];
  marshalResults: LeadGatekeeperResult[];
  pipelineLog: string[];
  error: string | null;
  lastError: string | null;
  failedNode: string | null;
  lastKnownGoodNode: string | null;
  lastKnownGoodCheckpointId: string | null;
  stateFingerprint: string | null;
  threadFrozen: boolean;
  recoveryApplied: boolean;
  injectScorerFailure: boolean;
  quarantineDlq: QuarantineRecord[];
};

/** LangGraph state schema for the Ironleads linear harvest micro-graph. */
export const IronleadsStateSchema = Annotation.Root({
  sourceIds: Annotation<string[]>({
    reducer: (_x, y) => y ?? [],
    default: () => [],
  }),
  scoutOnly: Annotation<boolean>({
    reducer: (_x, y) => y ?? false,
    default: () => false,
  }),
  skipIngress: Annotation<boolean>({
    reducer: (_x, y) => y ?? false,
    default: () => false,
  }),
  runId: Annotation<string | null>({
    reducer: (_x, y) => y ?? null,
    default: () => null,
  }),
  scoutResults: Annotation<LeadScoutResult[]>({
    reducer: (_x, y) => y ?? [],
    default: () => [],
  }),
  parserResults: Annotation<SignalFilterResult[]>({
    reducer: (_x, y) => y ?? [],
    default: () => [],
  }),
  parsedLeads: Annotation<ParsedLeadRecord[]>({
    reducer: (_x, y) => y ?? [],
    default: () => [],
  }),
  scoredLeads: Annotation<ScoredLeadRecord[]>({
    reducer: (_x, y) => y ?? [],
    default: () => [],
  }),
  strategistResults: Annotation<StrategizedLeadRecord[]>({
    reducer: (_x, y) => y ?? [],
    default: () => [],
  }),
  marshalResults: Annotation<LeadGatekeeperResult[]>({
    reducer: (_x, y) => y ?? [],
    default: () => [],
  }),
  pipelineLog: Annotation<string[]>({
    reducer: (x, y) => (x ?? []).concat(y ?? []),
    default: () => [],
  }),
  error: Annotation<string | null>({
    reducer: (_x, y) => y ?? null,
    default: () => null,
  }),
  lastError: Annotation<string | null>({
    reducer: (_x, y) => y ?? null,
    default: () => null,
  }),
  failedNode: Annotation<string | null>({
    reducer: (_x, y) => y ?? null,
    default: () => null,
  }),
  lastKnownGoodNode: Annotation<string | null>({
    reducer: (_x, y) => y ?? null,
    default: () => null,
  }),
  lastKnownGoodCheckpointId: Annotation<string | null>({
    reducer: (_x, y) => y ?? null,
    default: () => null,
  }),
  stateFingerprint: Annotation<string | null>({
    reducer: (_x, y) => y ?? null,
    default: () => null,
  }),
  threadFrozen: Annotation<boolean>({
    reducer: (_x, y) => y ?? false,
    default: () => false,
  }),
  recoveryApplied: Annotation<boolean>({
    reducer: (_x, y) => y ?? false,
    default: () => false,
  }),
  injectScorerFailure: Annotation<boolean>({
    reducer: (_x, y) => y ?? false,
    default: () => false,
  }),
  quarantineDlq: Annotation<QuarantineRecord[]>({
    reducer: (_x, y) => y ?? [],
    default: () => [],
  }),
});
