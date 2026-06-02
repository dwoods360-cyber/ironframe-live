import "server-only";

import type { RunnableConfig } from "@langchain/core/runnables";
import type { CheckpointTuple } from "@langchain/langgraph-checkpoint";
import { TRANSACTION_ABORTED } from "@/src/services/orchestration/forensicFaultInjection";
import { getPostgresCheckpointer } from "@/src/services/orchestration/checkpointer";

export const EPIC_15_ROLLBACK_LOG_PREFIX = "[epic15-forensic-rollback]";

export type ForensicRollbackResult = {
  status: "ROLLED_BACK" | "NOOP" | "ANCHOR_NOT_FOUND";
  threadId: string;
  tenantId: string;
  anchorCheckpointId: string | null;
  reason: string;
  checkpointsScanned: number;
};

export type CheckpointedGraphLike = {
  getState: (config: RunnableConfig) => Promise<{
    values: Record<string, unknown>;
    next: string[];
    config?: RunnableConfig;
  }>;
  updateState?: (
    config: RunnableConfig,
    values: Record<string, unknown>,
    asNode?: string,
  ) => Promise<{ configurable?: Record<string, unknown> }>;
};

const DEFAULT_BLOCKLISTED_NEXT = ["persist"] as const;

function tenantFromValues(values: Record<string, unknown> | undefined): string | null {
  const raw = values?.tenant_id ?? values?.tenantId;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function checkpointAssignee(values: Record<string, unknown> | undefined): string {
  const raw = values?.currentAssignee ?? values?.current_agent;
  return typeof raw === "string" ? raw : "";
}

export function isForensicRollbackEligibleError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes(TRANSACTION_ABORTED) || /graph interrupt|node crash|worker fault/i.test(message);
}

/** Select the newest checkpoint that has not reached a blocklisted terminal node. */
export function selectForensicRollbackAnchor(
  tuples: CheckpointTuple[],
  options?: { blocklistedNext?: readonly string[] },
): CheckpointTuple | null {
  const blocklisted = options?.blocklistedNext ?? DEFAULT_BLOCKLISTED_NEXT;

  for (const tuple of tuples) {
    if (!tuple.checkpoint?.id) continue;
    const blob = JSON.stringify({
      values: tuple.checkpoint.channel_values,
      metadata: tuple.metadata,
    }).toLowerCase();
    if (blocklisted.some((node) => blob.includes(`"${node.toLowerCase()}"`))) {
      continue;
    }
    return tuple;
  }

  return null;
}

export async function listThreadCheckpointTuples(threadId: string): Promise<CheckpointTuple[]> {
  const cp = await getPostgresCheckpointer();
  const config: RunnableConfig = {
    configurable: { thread_id: threadId.trim(), checkpoint_ns: "" },
  };
  const tuples: CheckpointTuple[] = [];
  for await (const tuple of cp.list(config, { limit: 32 })) {
    tuples.push(tuple);
  }
  return tuples;
}

/**
 * Epic 15 — rewind LangGraph thread head to last uncorrupted Postgres checkpoint.
 */
export async function executeForensicCheckpointRollback(args: {
  graph: CheckpointedGraphLike;
  threadId: string;
  tenantId: string;
  reason: string;
  blocklistedNext?: readonly string[];
}): Promise<ForensicRollbackResult> {
  const threadId = args.threadId.trim();
  const tenantId = args.tenantId.trim();
  const config: RunnableConfig = {
    configurable: { thread_id: threadId, checkpoint_ns: "" },
  };

  const tuples = await listThreadCheckpointTuples(threadId);
  const anchor = selectForensicRollbackAnchor(tuples, {
    blocklistedNext: args.blocklistedNext,
  });

  if (!anchor?.checkpoint?.id) {
    console.warn(
      EPIC_15_ROLLBACK_LOG_PREFIX,
      JSON.stringify({
        status: "ANCHOR_NOT_FOUND",
        threadId,
        tenantId,
        reason: args.reason,
        checkpointsScanned: tuples.length,
      }),
    );
    return {
      status: "ANCHOR_NOT_FOUND",
      threadId,
      tenantId,
      anchorCheckpointId: null,
      reason: args.reason,
      checkpointsScanned: tuples.length,
    };
  }

  const anchorValues = (anchor.checkpoint.channel_values ?? {}) as Record<string, unknown>;
  const stampedTenant = tenantFromValues(anchorValues);
  if (stampedTenant && stampedTenant !== tenantId) {
    throw new Error(
      `CRITICAL_TENANT_VIOLATION: Rollback anchor tenant ${stampedTenant} != ${tenantId}`,
    );
  }

  const anchorConfig: RunnableConfig = {
    configurable: {
      thread_id: threadId,
      checkpoint_ns: "",
      checkpoint_id: anchor.checkpoint.id,
    },
  };

  if (typeof args.graph.updateState === "function") {
    await args.graph.updateState(anchorConfig, {
      forensicRollback: {
        status: "ROLLED_BACK",
        at: new Date().toISOString(),
        reason: args.reason,
        anchorCheckpointId: anchor.checkpoint.id,
        tenantId,
      },
    });
  }

  const head = await args.graph.getState(anchorConfig);

  console.info(
    EPIC_15_ROLLBACK_LOG_PREFIX,
    JSON.stringify({
      status: "ROLLED_BACK",
      threadId,
      tenantId,
      anchorCheckpointId: anchor.checkpoint.id,
      reason: args.reason,
      checkpointsScanned: tuples.length,
      headNext: head.next,
      headAssignee: checkpointAssignee(head.values),
    }),
  );

  return {
    status: "ROLLED_BACK",
    threadId,
    tenantId,
    anchorCheckpointId: anchor.checkpoint.id,
    reason: args.reason,
    checkpointsScanned: tuples.length,
  };
}

/** Invoke a checkpointed graph; on worker fault, execute audited forensic rollback then rethrow. */
export async function invokeGraphWithForensicRollback<TInput, TOutput>(
  graph: CheckpointedGraphLike & {
    invoke: (input: TInput, config: RunnableConfig) => Promise<TOutput>;
  },
  input: TInput,
  config: RunnableConfig,
  context: { tenantId: string; threadId: string },
): Promise<TOutput> {
  const threadId =
    typeof config.configurable?.thread_id === "string"
      ? config.configurable.thread_id
      : context.threadId;

  try {
    return await graph.invoke(input, config);
  } catch (error) {
    if (!isForensicRollbackEligibleError(error)) {
      throw error;
    }

    const reason = error instanceof Error ? error.message : String(error);
    await executeForensicCheckpointRollback({
      graph,
      threadId,
      tenantId: context.tenantId,
      reason,
    });
    throw error;
  }
}
