import {
  BaseCheckpointSaver,
  type Checkpoint,
  type CheckpointMetadata,
  type CheckpointTuple,
} from "@langchain/langgraph";
import type {
  ChannelVersions,
  CheckpointListOptions,
  PendingWrite,
} from "@langchain/langgraph-checkpoint";
import type { AgentGraphState, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

const DEFAULT_TENANT_UUID = "00000000-0000-0000-0000-000000000000";

type CheckpointEnvelope = {
  checkpoint: Checkpoint;
  metadata?: CheckpointMetadata;
  newVersions?: ChannelVersions;
  pendingWrites?: Array<[string, string, unknown]>;
};

function safeJsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  if (value instanceof Map) {
    return {
      __type: "Map",
      entries: Array.from(value.entries()),
    };
  }
  if (value instanceof Set) {
    return {
      __type: "Set",
      values: Array.from(value.values()),
    };
  }
  if (value instanceof Uint8Array) {
    return {
      __type: "Uint8Array",
      values: Array.from(value),
    };
  }
  return value;
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  const seen = new WeakSet<object>();
  const serialized = JSON.stringify(value, (key, nestedValue) => {
    if (
      nestedValue !== null &&
      typeof nestedValue === "object" &&
      !(nestedValue instanceof Date) &&
      !(nestedValue instanceof Error) &&
      !(nestedValue instanceof Map) &&
      !(nestedValue instanceof Set) &&
      !(nestedValue instanceof Uint8Array)
    ) {
      const obj = nestedValue as object;
      if (seen.has(obj)) {
        return "[Circular]";
      }
      seen.add(obj);
    }
    return safeJsonReplacer(key, nestedValue);
  });
  return JSON.parse(serialized) as Prisma.InputJsonValue;
}

function readThreadId(config: { configurable?: Record<string, unknown> }): string {
  const configurable = (config.configurable ?? {}) as Record<string, unknown>;
  const threadId = configurable.thread_id;
  if (typeof threadId !== "string" || threadId.trim().length === 0) {
    throw new Error('Missing required "configurable.thread_id" for PrismaCheckpointer.');
  }
  return threadId.trim();
}

function resolveTenantId(
  config: { configurable?: Record<string, unknown> },
  checkpoint?: Checkpoint,
): string {
  const configurable = (config.configurable ?? {}) as Record<string, unknown>;
  const fromConfig =
    typeof configurable.tenantId === "string"
      ? configurable.tenantId
      : typeof configurable.tenant_id === "string"
      ? configurable.tenant_id
      : null;
  if (fromConfig && fromConfig.trim().length > 0) {
    return fromConfig.trim();
  }

  const values = checkpoint?.channel_values as Record<string, unknown> | undefined;
  const fromState = values?.tenant_id;
  if (typeof fromState === "string" && fromState.trim().length > 0) {
    return fromState.trim();
  }
  return DEFAULT_TENANT_UUID;
}

function toEnvelope(state: AgentGraphState["state"]): CheckpointEnvelope | null {
  if (!state || typeof state !== "object" || Array.isArray(state)) return null;
  const data = state as Record<string, unknown>;
  if (!("checkpoint" in data)) return null;
  const checkpoint = data.checkpoint as Checkpoint | undefined;
  if (!checkpoint || typeof checkpoint !== "object") return null;
  return {
    checkpoint,
    metadata: data.metadata as CheckpointMetadata | undefined,
    newVersions: data.newVersions as ChannelVersions | undefined,
    pendingWrites: Array.isArray(data.pendingWrites)
      ? (data.pendingWrites as Array<[string, string, unknown]>)
      : [],
  };
}

export class PrismaCheckpointer extends BaseCheckpointSaver {
  async getTuple(config: any): Promise<CheckpointTuple | undefined> {
    const threadId = readThreadId(config);
    const row = await prisma.agentGraphState.findUnique({
      where: { threadId },
    });
    if (!row) return undefined;

    const envelope = toEnvelope(row.state);
    if (!envelope) return undefined;

    return {
      config: {
        configurable: {
          thread_id: threadId,
          checkpoint_id: envelope.checkpoint.id,
        },
      },
      checkpoint: envelope.checkpoint,
      metadata: envelope.metadata,
      pendingWrites: envelope.pendingWrites,
    };
  }

  async *list(config: any, _options?: CheckpointListOptions): AsyncGenerator<CheckpointTuple> {
    const tuple = await this.getTuple(config);
    if (tuple) {
      yield tuple;
    }
  }

  async put(
    config: any,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata,
    newVersions: ChannelVersions,
  ): Promise<any> {
    const threadId = readThreadId(config);
    const tenantId = resolveTenantId(config, checkpoint);

    const envelope: CheckpointEnvelope = {
      checkpoint,
      metadata,
      newVersions,
      pendingWrites: [],
    };

    await prisma.agentGraphState.upsert({
      where: { threadId },
      update: {
        state: toPrismaJson(envelope),
        tenantId,
      },
      create: {
        threadId,
        tenantId,
        state: toPrismaJson(envelope),
      },
    });

    const configurable = (config.configurable ?? {}) as Record<string, unknown>;
    return {
      ...config,
      configurable: {
        ...configurable,
        thread_id: threadId,
        checkpoint_id: checkpoint.id,
      },
    };
  }

  async putWrites(config: any, writes: PendingWrite[], taskId: string): Promise<void> {
    const threadId = readThreadId(config);
    const row = await prisma.agentGraphState.findUnique({
      where: { threadId },
    });
    if (!row) return;

    const envelope = toEnvelope(row.state);
    if (!envelope) return;

    const serializedWrites: Array<[string, string, unknown]> = writes.map(([channel, value]) => [
      taskId,
      String(channel),
      value,
    ]);

    envelope.pendingWrites = [...(envelope.pendingWrites ?? []), ...serializedWrites];

    await prisma.agentGraphState.update({
      where: { threadId },
      data: {
        state: toPrismaJson(envelope),
      },
    });
  }

  async deleteThread(threadId: string): Promise<void> {
    await prisma.agentGraphState.deleteMany({
      where: { threadId },
    });
  }
}

