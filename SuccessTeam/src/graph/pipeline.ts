import { randomUUID } from 'node:crypto';

import { END, StateGraph } from '@langchain/langgraph';

import { getSuccessTeamCheckpointer } from './checkpointer.js';
import {
  advisoryGatekeeperNode,
  expansionFinderNode,
  healthAuditorNode,
  pollAccountsNode,
  valueQuantifierNode,
} from './nodes.js';
import { SuccessTeamStateSchema, type SuccessTeamGraphState, type SuccessTeamPipelineInput } from './state.js';

export const successTeamPipeline = new StateGraph(SuccessTeamStateSchema)
  .addNode('poll', pollAccountsNode)
  .addNode('healthAuditor', healthAuditorNode)
  .addNode('valueQuantifier', valueQuantifierNode)
  .addNode('expansionFinder', expansionFinderNode)
  .addNode('advisoryGatekeeper', advisoryGatekeeperNode)
  .addEdge('__start__', 'poll')
  .addEdge('poll', 'healthAuditor')
  .addEdge('healthAuditor', 'valueQuantifier')
  .addEdge('valueQuantifier', 'expansionFinder')
  .addEdge('expansionFinder', 'advisoryGatekeeper')
  .addEdge('advisoryGatekeeper', END);

const checkpointer = getSuccessTeamCheckpointer();

export const successTeamApp = successTeamPipeline.compile({ checkpointer });

export type PollGraphResult = SuccessTeamGraphState & {
  threadId: string;
  summary: {
    accountsSeen: number;
    newAccounts: number;
    advisoriesQueued: number;
    failed: number;
  };
};

function buildInitialState(runId: string): Partial<SuccessTeamGraphState> {
  return {
    runId,
    accounts: [],
    newAccountIds: [],
    snapshots: {},
    advisories: [],
    pipelineLog: [],
    error: null,
    lastKnownGoodNode: null,
    lastKnownGoodCheckpointId: null,
  };
}

function summarize(finalState: SuccessTeamGraphState) {
  const accountsSeen = finalState.accounts.length;
  const newAccounts = finalState.newAccountIds.length;
  const advisoriesQueued = finalState.advisories.filter((d) => d.shipped).length;
  const failed = finalState.advisories.filter((d) => d.error).length;
  return { accountsSeen, newAccounts, advisoriesQueued, failed };
}

export async function invokeSuccessTeamPoll(
  input: SuccessTeamPipelineInput = {},
): Promise<PollGraphResult> {
  const threadId = input.threadId?.trim() || randomUUID();
  const finalState = (await successTeamApp.invoke(buildInitialState(threadId), {
    configurable: { thread_id: threadId },
    durability: 'sync',
  })) as SuccessTeamGraphState;

  return {
    ...finalState,
    threadId,
    summary: summarize(finalState),
  };
}
