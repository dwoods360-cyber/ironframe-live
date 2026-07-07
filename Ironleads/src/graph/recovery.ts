import type { RunnableConfig } from '@langchain/core/runnables';
import type { CompiledStateGraph } from '@langchain/langgraph';

import { LKG_PARSER_SUCCESS } from './lkg.js';
import { quarantineDlqNode } from './nodes.js';
import type { IronleadsGraphState } from './state.js';
import { getIronleadsFailurePolicy } from '../loadIronleadsEnv.js';

export { LKG_PARSER_SUCCESS, fingerprintParserSuccess } from './lkg.js';

type StateSnapshot = Awaited<ReturnType<CompiledStateGraph['getState']>>;

export async function collectThreadHistory(
  app: CompiledStateGraph,
  threadConfig: RunnableConfig,
): Promise<StateSnapshot[]> {
  const history: StateSnapshot[] = [];
  for await (const snapshot of app.getStateHistory(threadConfig)) {
    history.push(snapshot);
  }
  return history;
}

/** Locate the most recent pristine checkpoint after LeadParser succeeded. */
export function findLastKnownGoodSnapshot(history: StateSnapshot[]): StateSnapshot | null {
  for (const snapshot of history) {
    const values = snapshot.values as Partial<IronleadsGraphState> | undefined;
    if (values?.lastKnownGoodNode !== LKG_PARSER_SUCCESS) continue;
    if (!values.stateFingerprint) continue;
    if ((values.scoredLeads?.length ?? 0) > 0) continue;
    if ((values.strategistResults?.length ?? 0) > 0) continue;
    if (values.error || values.lastError) continue;
    const metadata = snapshot.metadata as { error?: unknown } | undefined;
    if (metadata?.error) continue;
    if (!snapshot.next?.length) continue;
    return snapshot;
  }
  return null;
}

/** Rewind graph execution to the Last Known Good checkpoint. */
export async function rewindToLastKnownGood(
  app: CompiledStateGraph,
  threadConfig: RunnableConfig,
  lastKnownGood: StateSnapshot,
): Promise<RunnableConfig> {
  const checkpointId = lastKnownGood.config.configurable?.checkpoint_id;
  if (!checkpointId) {
    throw new Error('Last Known Good snapshot is missing checkpoint_id');
  }

  return app.updateState(
    {
      ...threadConfig,
      configurable: {
        ...threadConfig.configurable,
        checkpoint_id: checkpointId,
      },
    },
    {
      ...(lastKnownGood.values as Partial<IronleadsGraphState>),
      scoredLeads: [],
      strategistResults: [],
      marshalResults: [],
      threadFrozen: false,
      recoveryApplied: true,
      error: null,
      lastError: null,
      pipelineLog: [`[recovery] rewound to ${LKG_PARSER_SUCCESS} @ ${checkpointId}`],
    },
    'parser',
  );
}

export type RecoveryOutcome = {
  applied: boolean;
  lastKnownGoodNode: string | null;
  failurePolicy: 'quarantine' | 'freeze';
  quarantined: number;
  threadFrozen: boolean;
  checkpointId: string | null;
  errorMessage: string;
};

/** Self-healing middleware — query history, rewind, then apply failure policy. */
export async function executeLastKnownGoodRecovery(
  app: CompiledStateGraph,
  threadConfig: RunnableConfig,
  error: unknown,
  failedNode = 'downstream',
): Promise<RecoveryOutcome> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const failurePolicy = getIronleadsFailurePolicy();

  const history = await collectThreadHistory(app, threadConfig);
  const lastKnownGood = findLastKnownGoodSnapshot(history);

  if (!lastKnownGood) {
    return {
      applied: false,
      lastKnownGoodNode: null,
      failurePolicy,
      quarantined: 0,
      threadFrozen: false,
      checkpointId: null,
      errorMessage,
    };
  }

  const checkpointId = lastKnownGood.config.configurable?.checkpoint_id ?? null;
  await rewindToLastKnownGood(app, threadConfig, lastKnownGood);

  const restored = lastKnownGood.values as Partial<IronleadsGraphState>;
  let quarantined = 0;
  let threadFrozen = false;

  if (failurePolicy === 'quarantine') {
    const dlqResult = await quarantineDlqNode({
      ...restored,
      lastError: errorMessage,
      error: errorMessage,
      failedNode,
    });
    await app.updateState(threadConfig, dlqResult, 'parser');
    quarantined = dlqResult.quarantineDlq?.length ?? restored.parsedLeads?.length ?? 0;
  } else {
    await app.updateState(
      threadConfig,
      {
        threadFrozen: true,
        lastError: errorMessage,
        error: errorMessage,
        pipelineLog: [`[recovery] thread frozen at ${LKG_PARSER_SUCCESS}`],
      },
      'parser',
    );
    threadFrozen = true;
  }

  return {
    applied: true,
    lastKnownGoodNode: LKG_PARSER_SUCCESS,
    failurePolicy,
    quarantined,
    threadFrozen,
    checkpointId,
    errorMessage,
  };
}
