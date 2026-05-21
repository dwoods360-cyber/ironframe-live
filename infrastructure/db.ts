/**
 * Epic 15 — Ironguard optimistic-lock checkpoint facade.
 * All LangGraph state is persisted via `getPostgresCheckpointer()` (PostgresSaver + DATABASE_URL).
 * In-process mutex chains remain for strict read–modify–write serialization per (id, tenant).
 */

import { randomUUID } from "crypto";
import type { Checkpoint } from "@langchain/langgraph-checkpoint";
import { getPostgresCheckpointer } from "@/src/services/orchestration/checkpointer";

export type LangGraphCheckpointRecord = {
  id: string;
  tenant_id: string;
  version: number;
  status: string;
  persisted_state: string;
  step: string;
  /** Serialized integer cents (BigInt-safe). */
  ale_impact: string;
  payload: Record<string, unknown>;
};

const IRONGUARD_CHANNEL = "ironguard_record" as const;

/** Per-compound-key mutex tail for strict serialization of checkpoint mutations. */
const langGraphLockChains = new Map<string, Promise<void>>();

function compoundKey(id: string, tenant_id: string): string {
  return `${tenant_id}::${id}`;
}

function langGraphThreadId(id: string, tenant_id: string): string {
  return compoundKey(id, tenant_id);
}

function runnableConfig(id: string, tenant_id: string, checkpoint_id?: string) {
  return {
    configurable: {
      thread_id: langGraphThreadId(id, tenant_id),
      checkpoint_ns: "",
      ...(checkpoint_id ? { checkpoint_id } : {}),
    },
  };
}

function normalizeCreate(
  data: Partial<LangGraphCheckpointRecord> & { id: string; tenant_id: string },
): LangGraphCheckpointRecord {
  const status = data.status ?? data.persisted_state ?? "PROCESSING";
  return {
    id: data.id,
    tenant_id: data.tenant_id,
    version: data.version ?? 1,
    status,
    persisted_state: data.persisted_state ?? status,
    step: data.step ?? "",
    ale_impact: data.ale_impact ?? "0",
    payload: data.payload && typeof data.payload === "object" ? { ...data.payload } : {},
  };
}

function parseRecord(channel_values: Record<string, unknown> | undefined): LangGraphCheckpointRecord | null {
  if (!channel_values) return null;
  const raw = channel_values[IRONGUARD_CHANNEL];
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : "";
  const tenant_id = typeof r.tenant_id === "string" ? r.tenant_id : "";
  if (!id || !tenant_id) return null;
  const version = typeof r.version === "number" ? r.version : 1;
  const status = typeof r.status === "string" ? r.status : "PROCESSING";
  const persisted_state = typeof r.persisted_state === "string" ? r.persisted_state : status;
  const step = typeof r.step === "string" ? r.step : "";
  const ale_impact = typeof r.ale_impact === "string" ? r.ale_impact : "0";
  const payload =
    r.payload && typeof r.payload === "object" && !Array.isArray(r.payload)
      ? { ...(r.payload as Record<string, unknown>) }
      : {};
  return {
    id,
    tenant_id,
    version,
    status,
    persisted_state,
    step,
    ale_impact,
    payload,
  };
}

function buildCheckpoint(row: LangGraphCheckpointRecord, prior?: Checkpoint): Checkpoint {
  const priorChannel = prior?.channel_versions?.[IRONGUARD_CHANNEL];
  const nextChannelVersion =
    typeof priorChannel === "number" ? priorChannel + 1 : typeof priorChannel === "string" ? 2 : 1;

  return {
    v: 4,
    id: randomUUID(),
    ts: new Date().toISOString(),
    channel_values: {
      tenant_id: row.tenant_id,
      [IRONGUARD_CHANNEL]: {
        ...row,
        payload: { ...row.payload },
      },
    },
    channel_versions: {
      __start__: 1,
      [IRONGUARD_CHANNEL]: nextChannelVersion,
    },
    versions_seen: prior?.versions_seen ?? { __input__: {} },
  };
}

async function persistRecord(row: LangGraphCheckpointRecord): Promise<LangGraphCheckpointRecord> {
  const cp = await getPostgresCheckpointer();
  const readConfig = runnableConfig(row.id, row.tenant_id);
  const tuple = await cp.getTuple(readConfig);
  const parentCheckpointId =
    typeof tuple?.config?.configurable?.checkpoint_id === "string"
      ? tuple.config.configurable.checkpoint_id
      : undefined;

  const writeConfig = runnableConfig(row.id, row.tenant_id, parentCheckpointId);
  const checkpoint = buildCheckpoint(row, tuple?.checkpoint);
  const metadata = tuple
    ? ({ source: "update" as const, step: row.version, parents: {} })
    : ({ source: "input" as const, step: -1, parents: {} });

  await cp.put(writeConfig, checkpoint, metadata, { [IRONGUARD_CHANNEL]: row.version });
  return { ...row, payload: { ...row.payload } };
}

async function withSerializedCheckpoint<T>(riskId: string, tenant_id: string, fn: () => Promise<T>): Promise<T> {
  const key = compoundKey(riskId, tenant_id);
  const prev = langGraphLockChains.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((r) => {
    release = r;
  });
  langGraphLockChains.set(key, prev.then(() => current));
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}

/**
 * Delete Ironguard LangGraph threads from Postgres (test isolation / teardown).
 */
export async function resetLangGraphCheckpointStore(scope?: {
  id: string;
  tenant_id: string;
}): Promise<void> {
  langGraphLockChains.clear();
  if (!process.env.DATABASE_URL?.trim()) return;
  if (!scope) return;
  const cp = await getPostgresCheckpointer();
  await cp.deleteThread(langGraphThreadId(scope.id, scope.tenant_id));
}

export const db = {
  withSerializedCheckpoint,

  langGraphCheckpoints: {
    async findUnique({
      where,
    }: {
      where: { id: string; tenant_id: string };
    }): Promise<LangGraphCheckpointRecord | null> {
      const cp = await getPostgresCheckpointer();
      const tuple = await cp.getTuple(runnableConfig(where.id, where.tenant_id));
      const values = tuple?.checkpoint?.channel_values as Record<string, unknown> | undefined;
      const row = parseRecord(values);
      return row ? { ...row, payload: { ...row.payload } } : null;
    },

    async create({
      data,
    }: {
      data: Partial<LangGraphCheckpointRecord> & { id: string; tenant_id: string };
    }): Promise<LangGraphCheckpointRecord> {
      const existing = await db.langGraphCheckpoints.findUnique({
        where: { id: data.id, tenant_id: data.tenant_id },
      });
      if (existing) {
        throw new Error(`LangGraphCheckpoint already exists: ${compoundKey(data.id, data.tenant_id)}`);
      }
      const row = normalizeCreate(data);
      return persistRecord(row);
    },

    async upsert({
      where,
      create,
      update,
    }: {
      where: { id: string; tenant_id: string };
      create: Partial<LangGraphCheckpointRecord> & { id: string; tenant_id: string };
      update: Partial<Pick<LangGraphCheckpointRecord, "persisted_state" | "step" | "ale_impact" | "status">>;
    }): Promise<LangGraphCheckpointRecord> {
      const existing = await db.langGraphCheckpoints.findUnique({ where });
      const next: LangGraphCheckpointRecord = existing
        ? {
            ...existing,
            ...update,
            persisted_state: update.persisted_state ?? existing.persisted_state,
            status: update.status ?? update.persisted_state ?? existing.status,
            step: update.step ?? existing.step,
            ale_impact: update.ale_impact ?? existing.ale_impact,
            version: existing.version,
            payload: { ...existing.payload },
          }
        : normalizeCreate({ ...create, ...update });
      return persistRecord(next);
    },

    async _replace(row: LangGraphCheckpointRecord): Promise<LangGraphCheckpointRecord> {
      return persistRecord({ ...row, payload: { ...row.payload } });
    },
  },
};
