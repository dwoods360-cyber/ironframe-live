import { randomUUID } from 'node:crypto';

import { END, StateGraph } from '@langchain/langgraph';

import { getIronleadsCheckpointer } from './checkpointer.js';
import {
  leadMarshalNode,
  leadParserNode,
  leadScoutNode,
  leadScorerNode,
  leadStrategistNode,
} from './nodes.js';
import { executeLastKnownGoodRecovery, type RecoveryOutcome } from './recovery.js';
import { IronleadsStateSchema, type IronleadsGraphState, type IronleadsPipelineInput } from './state.js';

/** Architectural representation of the linear Ironleads harvest micro-graph. */
export const ironleadsPipeline = new StateGraph(IronleadsStateSchema)
  .addNode('scout', leadScoutNode)
  .addNode('parser', leadParserNode)
  .addNode('scorer', leadScorerNode)
  .addNode('strategist', leadStrategistNode)
  .addNode('marshal', leadMarshalNode)
  .addEdge('__start__', 'scout')
  .addEdge('scout', 'parser')
  .addEdge('parser', 'scorer')
  .addEdge('scorer', 'strategist')
  .addEdge('strategist', 'marshal')
  .addEdge('marshal', END);

const checkpointer = getIronleadsCheckpointer();

/** Compiled graph with SQLite checkpointing (self-healing orchestrator). */
export const ironleadsApp = ironleadsPipeline.compile({ checkpointer });

export type HarvestGraphResult = IronleadsGraphState & {
  threadId: string;
  recovery: RecoveryOutcome | null;
  summary: {
    signalsFetched: number;
    qualified: number;
    shipped: number;
    dropped: number;
    quarantined: number;
  };
};

function buildInitialState(
  input: IronleadsPipelineInput,
  threadId: string,
): Partial<IronleadsGraphState> {
  return {
    sourceIds: input.sourceIds ?? [],
    scoutOnly: Boolean(input.scoutOnly),
    skipIngress: Boolean(input.skipIngress),
    injectScorerFailure: Boolean(input.injectScorerFailure),
    runId: threadId,
    scoutResults: [],
    parserResults: [],
    parsedLeads: [],
    scoredLeads: [],
    strategistResults: [],
    marshalResults: [],
    pipelineLog: [],
    error: null,
    lastError: null,
    failedNode: null,
    lastKnownGoodNode: null,
    lastKnownGoodCheckpointId: null,
    stateFingerprint: null,
    threadFrozen: false,
    recoveryApplied: false,
    quarantineDlq: [],
  };
}

function summarize(finalState: IronleadsGraphState) {
  const signalsFetched = finalState.scoutResults.filter(row => row.stored).length;
  const qualified = finalState.parsedLeads.length;
  const shipped = finalState.marshalResults.filter(row => row.shipped).length;
  const dropped = finalState.parserResults.filter(row => !row.qualified).length;
  const quarantined = finalState.quarantineDlq.length;
  return { signalsFetched, qualified, shipped, dropped, quarantined };
}

export async function invokeIronleadsPipeline(
  input: IronleadsPipelineInput = {},
): Promise<HarvestGraphResult> {
  const threadId = input.threadId?.trim() || randomUUID();
  const threadConfig = {
    configurable: { thread_id: threadId },
    durability: 'sync' as const,
  };
  let recovery: RecoveryOutcome | null = null;

  let finalState: IronleadsGraphState;
  try {
    finalState = (
      input.resume
        ? await ironleadsApp.invoke(null, threadConfig)
        : await ironleadsApp.invoke(buildInitialState(input, threadId), threadConfig)
    ) as IronleadsGraphState;
  } catch (err) {
    recovery = await executeLastKnownGoodRecovery(ironleadsApp, threadConfig, err, 'scorer');
    if (!recovery.applied) throw err;

    const snapshot = await ironleadsApp.getState(threadConfig);
    finalState = snapshot.values as IronleadsGraphState;
    finalState = {
      ...finalState,
      pipelineLog: [
        ...(finalState.pipelineLog ?? []),
        `[recovery] failure policy=${recovery.failurePolicy} quarantined=${recovery.quarantined}`,
      ],
      recoveryApplied: true,
      quarantineDlq:
        recovery.failurePolicy === 'quarantine'
          ? finalState.quarantineDlq ?? []
          : finalState.quarantineDlq ?? [],
    };
  }

  return {
    ...finalState,
    threadId,
    recovery,
    summary: summarize(finalState),
  };
}
