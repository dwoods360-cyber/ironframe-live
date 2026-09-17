import "server-only";

import type { RunnableConfig } from "@langchain/core/runnables";
import type {
  ChannelVersions,
  Checkpoint,
  CheckpointListOptions,
  CheckpointMetadata,
  CheckpointTuple,
  PendingWrite,
} from "@langchain/langgraph-checkpoint";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { Pool } from "pg";
import {
  assertCheckpointTenantParity,
  composeCheckpointThreadId,
  parseCheckpointThreadTenant,
  requireCheckpointTenantUuid,
  tenantIdFromCheckpointValues,
} from "@/src/services/orchestration/checkpointTenant";

/**
 * Epic 15 — Agent 04 (Irontech) Postgres checkpoint authority.
 * Thread IDs are tenant-prefixed; every read asserts stamp parity before return.
 */

export class Epic15DatabaseConfigError extends Error {
  constructor(detail: string) {
    super(`EPIC_15_DATABASE_CONFIG: ${detail}`);
    this.name = "Epic15DatabaseConfigError";
  }
}

/** CI must use ephemeral Postgres — block accidental remote Supabase URLs in GITHUB_ACTIONS. */
export function assertEpic15DatabaseUrlLock(): void {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Epic15DatabaseConfigError(
      "DATABASE_URL is required for LangGraph checkpoint pool and forensic rollback tests.",
    );
  }
  const inCi = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
  if (inCi && /supabase\.co/i.test(url)) {
    throw new Epic15DatabaseConfigError(
      "CI DATABASE_URL must target ephemeral Postgres (127.0.0.1), not remote Supabase.",
    );
  }
}

let checkpointPool: Pool | null = null;
let postgresCheckpointer: PostgresSaver | null = null;
let setupPromise: Promise<void> | null = null;

function connectionString(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is required for LangGraph Postgres checkpointing.");
  }
  return url;
}

function buildCheckpointPool(): Pool {
  const url = connectionString();
  const isLocal = /localhost|127\.0\.0\.1/i.test(url);
  return new Pool({
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 30_000,
    ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
  });
}

function configThreadId(config: RunnableConfig | undefined): string {
  const raw = config?.configurable?.thread_id;
  return typeof raw === "string" ? raw.trim() : "";
}

function configTenantId(config: RunnableConfig | undefined): string | undefined {
  const raw = config?.configurable?.tenant_id;
  return typeof raw === "string" ? raw.trim() : undefined;
}

function bindCheckpointConfig(
  config: RunnableConfig,
  fallbackTenant?: string,
): { config: RunnableConfig; tenant: string } {
  const threadId = configThreadId(config);
  if (!threadId) {
    throw new Error("CHECKPOINT_THREAD_ID_REQUIRED");
  }
  const tenant = requireCheckpointTenantUuid(
    configTenantId(config) ?? parseCheckpointThreadTenant(threadId) ?? fallbackTenant,
  );
  const boundThread = composeCheckpointThreadId(tenant, threadId);
  return {
    tenant,
    config: {
      ...config,
      configurable: {
        ...config.configurable,
        thread_id: boundThread,
        tenant_id: tenant,
      },
    },
  };
}

function resolvePutTenant(config: RunnableConfig, checkpoint: Checkpoint): string {
  return requireCheckpointTenantUuid(
    configTenantId(config) ??
      parseCheckpointThreadTenant(configThreadId(config)) ??
      tenantIdFromCheckpointValues(checkpoint.channel_values),
  );
}

function stampCheckpoint(checkpoint: Checkpoint, tenant: string): Checkpoint {
  const values =
    checkpoint.channel_values && typeof checkpoint.channel_values === "object"
      ? { ...(checkpoint.channel_values as Record<string, unknown>) }
      : {};
  const existing = tenantIdFromCheckpointValues(values);
  if (existing && existing !== tenant) {
    throw new Error(
      `CRITICAL_TENANT_VIOLATION: checkpoint stamp ${existing} does not match tenant ${tenant}.`,
    );
  }
  return {
    ...checkpoint,
    channel_values: { ...values, tenant_id: tenant },
  };
}

function assertReturnedTuple(tuple: CheckpointTuple, tenant: string, threadId: string): CheckpointTuple {
  assertCheckpointTenantParity({
    callerTenant: tenant,
    threadId,
    channelValues: tuple.checkpoint?.channel_values,
  });
  return tuple;
}

/**
 * Prefixes thread IDs with the tenant UUID and refuses to return unstamped
 * or cross-tenant checkpoint state. Database tenant_id is filled from that prefix.
 */
class TenantBoundPostgresSaver extends PostgresSaver {
  override async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const bound = bindCheckpointConfig(config);
    const tuple = await super.getTuple(bound.config);
    if (!tuple?.checkpoint) return tuple;
    return assertReturnedTuple(tuple, bound.tenant, String(bound.config.configurable?.thread_id ?? ""));
  }

  override async *list(
    config: RunnableConfig,
    options?: CheckpointListOptions,
  ): AsyncGenerator<CheckpointTuple> {
    const bound = bindCheckpointConfig(config);
    const threadId = String(bound.config.configurable?.thread_id ?? "");
    for await (const tuple of super.list(bound.config, options)) {
      if (!tuple?.checkpoint) continue;
      yield assertReturnedTuple(tuple, bound.tenant, threadId);
    }
  }

  override async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata,
    newVersions: ChannelVersions,
  ): Promise<RunnableConfig> {
    const tenant = resolvePutTenant(config, checkpoint);
    const bound = bindCheckpointConfig(config, tenant);
    return super.put(bound.config, stampCheckpoint(checkpoint, tenant), metadata, newVersions);
  }

  override async putWrites(
    config: RunnableConfig,
    writes: PendingWrite[],
    taskId: string,
  ): Promise<void> {
    const bound = bindCheckpointConfig(config);
    return super.putWrites(bound.config, writes, taskId);
  }

  override async deleteThread(threadId: string): Promise<void> {
    const trimmed = threadId.trim();
    const tenant = parseCheckpointThreadTenant(trimmed);
    if (!tenant) {
      throw new Error("IRONGUARD_SESSION_TENANT_UUID_REQUIRED");
    }
    return super.deleteThread(composeCheckpointThreadId(tenant, trimmed));
  }
}

/** Sole authority checkpointer — call `setup()` once per process via `getPostgresCheckpointer()`. */
export async function getPostgresCheckpointer(): Promise<PostgresSaver> {
  assertEpic15DatabaseUrlLock();
  if (!postgresCheckpointer) {
    checkpointPool = buildCheckpointPool();
    postgresCheckpointer = new TenantBoundPostgresSaver(checkpointPool);
    setupPromise ??= postgresCheckpointer.setup().catch((err) => {
      setupPromise = null;
      throw err;
    });
    await setupPromise;
  }
  return postgresCheckpointer;
}

/** @deprecated Use `getPostgresCheckpointer()` — retained for sovereign graph compile path. */
export class IronTech {
  static getCheckpointer(): Promise<PostgresSaver> {
    return getPostgresCheckpointer();
  }
}

export type OperationalStateFreezeResult = {
  status: "OPERATIONAL_FREEZE_LOCKED";
  checkpointId: string;
  timestamp: string;
  tenantId: string;
  threadId: string;
};

/**
 * Resolve latest LangGraph checkpoint for a thread and enforce tenant stamp parity
 * before any channel values are returned.
 */
export async function getTenantBoundCheckpointTuple(
  threadId: string,
  tenantId: string,
): Promise<CheckpointTuple | null> {
  const trimmedThread = threadId.trim();
  const tenant = requireCheckpointTenantUuid(tenantId);
  if (!trimmedThread) {
    throw new Error("CHECKPOINT_THREAD_ID_REQUIRED");
  }

  const checkpointer = await getPostgresCheckpointer();
  const tuple = await checkpointer.getTuple({
    configurable: { thread_id: trimmedThread, tenant_id: tenant },
  });
  if (!tuple?.checkpoint) return null;
  return tuple;
}

/**
 * Epic 15 — pull freeze metadata from Postgres, not volatile memory.
 */
export async function executeAutonomousStateFreeze(
  threadId: string,
  tenantId: string,
): Promise<OperationalStateFreezeResult> {
  const tuple = await getTenantBoundCheckpointTuple(threadId, tenantId);
  if (!tuple?.checkpoint) {
    throw new Error(`CRITICAL_STATE_FETCH_FAILURE: Thread ${threadId} could not be resolved.`);
  }

  return {
    status: "OPERATIONAL_FREEZE_LOCKED",
    checkpointId: tuple.checkpoint.id,
    timestamp: new Date().toISOString(),
    tenantId: requireCheckpointTenantUuid(tenantId),
    threadId: composeCheckpointThreadId(tenantId, threadId),
  };
}

/** Hydrate sovereign graph state values for resume / Ironguard gates. */
export async function getSovereignCheckpointChannelValues(
  threadId: string,
  tenantId: string,
): Promise<Record<string, unknown> | null> {
  const tuple = await getTenantBoundCheckpointTuple(threadId, tenantId);
  if (!tuple?.checkpoint) return null;
  const values = tuple.checkpoint.channel_values;
  if (values == null || typeof values !== "object") return {};
  return values as Record<string, unknown>;
}
