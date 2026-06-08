import "server-only";

import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import type { CheckpointTuple } from "@langchain/langgraph-checkpoint";
import { Pool } from "pg";

/**
 * Epic 15 — Agent 04 (Irontech) Postgres checkpoint authority.
 * Tenant isolation: every read validates `channel_values.tenant_id` against the caller stamp.
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

/** Sole authority checkpointer — call `setup()` once per process via `getPostgresCheckpointer()`. */
export async function getPostgresCheckpointer(): Promise<PostgresSaver> {
  assertEpic15DatabaseUrlLock();
  if (!postgresCheckpointer) {
    checkpointPool = buildCheckpointPool();
    postgresCheckpointer = new PostgresSaver(checkpointPool);
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

function tenantIdFromCheckpointValues(values: unknown): string | null {
  if (values == null || typeof values !== "object") return null;
  const tenant = (values as Record<string, unknown>).tenant_id;
  return typeof tenant === "string" && tenant.trim() ? tenant.trim() : null;
}

/**
 * Resolve latest LangGraph checkpoint for a thread and enforce tenant stamp parity.
 */
export async function getTenantBoundCheckpointTuple(
  threadId: string,
  tenantId: string,
): Promise<CheckpointTuple | null> {
  const trimmedThread = threadId.trim();
  const trimmedTenant = tenantId.trim();
  if (!trimmedThread || !trimmedTenant) return null;

  const checkpointer = await getPostgresCheckpointer();
  const tuple = await checkpointer.getTuple({
    configurable: { thread_id: trimmedThread },
  });
  if (!tuple?.checkpoint) return null;

  const stampedTenant = tenantIdFromCheckpointValues(tuple.checkpoint.channel_values);
  if (stampedTenant && stampedTenant !== trimmedTenant) {
    throw new Error(
      `CRITICAL_TENANT_VIOLATION: Thread ${trimmedThread} belongs to tenant ${stampedTenant}, not ${trimmedTenant}.`,
    );
  }

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
    tenantId: tenantId.trim(),
    threadId: threadId.trim(),
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
