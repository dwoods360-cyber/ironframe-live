import type { RunnableConfig } from '@langchain/core/runnables';

import { LKG_HEALTH_AUDITOR_SUCCESS } from './lkg.js';
import type { SuccessTeamGraphState } from './state.js';

export { LKG_HEALTH_AUDITOR_SUCCESS, fingerprintHealthAuditorSuccess } from './lkg.js';

type GraphSnapshot = {
  values: Partial<SuccessTeamGraphState>;
  config: RunnableConfig;
  metadata?: unknown;
  next?: string[];
};

type SuccessTeamCompiledGraph = {
  getState: (config: RunnableConfig) => Promise<GraphSnapshot>;
  getStateHistory: (config: RunnableConfig) => AsyncIterable<GraphSnapshot>;
  updateState: (
    config: RunnableConfig,
    values: Partial<SuccessTeamGraphState>,
    asNode?: string,
  ) => Promise<RunnableConfig>;
};

export async function collectThreadHistory(
  app: SuccessTeamCompiledGraph,
  threadConfig: RunnableConfig,
): Promise<GraphSnapshot[]> {
  const history: GraphSnapshot[] = [];
  for await (const snapshot of app.getStateHistory(threadConfig)) {
    history.push(snapshot);
  }
  return history;
}

export function findLastKnownGoodSnapshot(history: GraphSnapshot[]): GraphSnapshot | null {
  for (const snapshot of history) {
    const values = snapshot.values;
    if (values?.lastKnownGoodNode !== LKG_HEALTH_AUDITOR_SUCCESS) continue;
    if ((values.advisories?.length ?? 0) > 0) continue;
    if (values.error) continue;
    if (!snapshot.next?.length) continue;
    return snapshot;
  }
  return null;
}

export async function rewindToLastKnownGood(
  app: SuccessTeamCompiledGraph,
  threadConfig: RunnableConfig,
  lastKnownGood: GraphSnapshot,
): Promise<void> {
  const checkpointId = lastKnownGood.config.configurable?.checkpoint_id;
  if (!checkpointId) return;

  await app.updateState(
    {
      ...threadConfig,
      configurable: { ...threadConfig.configurable, checkpoint_id: checkpointId },
    },
    {
      ...lastKnownGood.values,
      error: null,
      advisories: [],
      pipelineLog: [`[recovery] rewound to ${LKG_HEALTH_AUDITOR_SUCCESS} @ ${checkpointId}`],
    },
    LKG_HEALTH_AUDITOR_SUCCESS,
  );
}

export type RecoveryResult = {
  recovered: boolean;
  lastKnownGoodNode: string | null;
  checkpointId: string | null;
};

export async function attemptSuccessTeamRecovery(
  app: SuccessTeamCompiledGraph,
  threadConfig: RunnableConfig,
): Promise<RecoveryResult> {
  const history = await collectThreadHistory(app, threadConfig);
  const lastKnownGood = findLastKnownGoodSnapshot(history);

  if (!lastKnownGood) {
    return { recovered: false, lastKnownGoodNode: null, checkpointId: null };
  }

  const checkpointId = lastKnownGood.config.configurable?.checkpoint_id ?? null;
  await rewindToLastKnownGood(app, threadConfig, lastKnownGood);

  return {
    recovered: true,
    lastKnownGoodNode: LKG_HEALTH_AUDITOR_SUCCESS,
    checkpointId: checkpointId ? String(checkpointId) : null,
  };
}
