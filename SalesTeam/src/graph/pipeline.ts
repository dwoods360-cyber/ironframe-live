import { randomUUID } from 'node:crypto';

import { END, StateGraph } from '@langchain/langgraph';

import { getSalesTeamCheckpointer } from './checkpointer.js';
import { draftOutreachNode, pollProspectsNode, queueApprovalNode } from './nodes.js';
import { SalesTeamStateSchema, type SalesTeamGraphState, type SalesTeamPipelineInput } from './state.js';

export const salesTeamPipeline = new StateGraph(SalesTeamStateSchema)
  .addNode('poll', pollProspectsNode)
  .addNode('draft', draftOutreachNode)
  .addNode('queue', queueApprovalNode)
  .addEdge('__start__', 'poll')
  .addEdge('poll', 'draft')
  .addEdge('draft', 'queue')
  .addEdge('queue', END);

const checkpointer = getSalesTeamCheckpointer();

export const salesTeamApp = salesTeamPipeline.compile({ checkpointer });

export type PollGraphResult = SalesTeamGraphState & {
  threadId: string;
  summary: {
    prospectsSeen: number;
    newProspects: number;
    draftsQueued: number;
    failed: number;
  };
};

function buildInitialState(runId: string): Partial<SalesTeamGraphState> {
  return {
    runId,
    prospects: [],
    newProspectIds: [],
    drafts: [],
    pipelineLog: [],
    error: null,
  };
}

function summarize(finalState: SalesTeamGraphState) {
  const prospectsSeen = finalState.prospects.length;
  const newProspects = finalState.newProspectIds.length;
  const draftsQueued = finalState.drafts.filter((d) => d.shipped).length;
  const failed = finalState.drafts.filter((d) => d.error).length;
  return { prospectsSeen, newProspects, draftsQueued, failed };
}

export async function invokeSalesTeamPoll(
  input: SalesTeamPipelineInput = {},
): Promise<PollGraphResult> {
  const threadId = input.threadId?.trim() || randomUUID();
  const finalState = (await salesTeamApp.invoke(buildInitialState(threadId), {
    configurable: { thread_id: threadId },
    durability: 'sync',
  })) as SalesTeamGraphState;

  return {
    ...finalState,
    threadId,
    summary: summarize(finalState),
  };
}
