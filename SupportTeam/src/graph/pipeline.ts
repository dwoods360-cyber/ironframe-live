import { randomUUID } from 'node:crypto';

import { END, StateGraph } from '@langchain/langgraph';

import { getSupportTeamCheckpointer } from './checkpointer.js';
import { enrichContextNode, pollTicketsNode, queueReplyNode } from './nodes.js';
import { SupportTeamStateSchema, type SupportTeamGraphState, type SupportTeamPipelineInput } from './state.js';

export const supportTeamPipeline = new StateGraph(SupportTeamStateSchema)
  .addNode('poll', pollTicketsNode)
  .addNode('enrich', enrichContextNode)
  .addNode('queue', queueReplyNode)
  .addEdge('__start__', 'poll')
  .addEdge('poll', 'enrich')
  .addEdge('enrich', 'queue')
  .addEdge('queue', END);

const checkpointer = getSupportTeamCheckpointer();

export const supportTeamApp = supportTeamPipeline.compile({ checkpointer });

export type PollGraphResult = SupportTeamGraphState & {
  threadId: string;
  summary: {
    ticketsSeen: number;
    newTickets: number;
    repliesQueued: number;
    failed: number;
  };
};

function buildInitialState(runId: string): Partial<SupportTeamGraphState> {
  return {
    runId,
    tickets: [],
    newTicketIds: [],
    pipelineLog: [],
    error: null,
  };
}

function summarize(finalState: SupportTeamGraphState) {
  const ticketsSeen = finalState.tickets.length;
  const newTickets = finalState.newTicketIds.length;
  const repliesQueued = finalState.drafts?.filter((d) => d.shipped).length ?? 0;
  const failed = finalState.drafts?.filter((d) => d.error).length ?? 0;
  return { ticketsSeen, newTickets, repliesQueued, failed };
}

export async function invokeSupportTeamPoll(
  input: SupportTeamPipelineInput = {},
): Promise<PollGraphResult> {
  const threadId = input.threadId?.trim() || randomUUID();
  const finalState = (await supportTeamApp.invoke(buildInitialState(threadId), {
    configurable: { thread_id: threadId },
    durability: 'sync',
  })) as SupportTeamGraphState;

  return {
    ...finalState,
    threadId,
    summary: summarize(finalState),
  };
}
