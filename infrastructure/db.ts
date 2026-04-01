/**
 * Epic 6 / LangGraph-style checkpoint persistence.
 * In-memory implementation with per-key serialization for optimistic concurrency tests.
 */

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

const store = new Map<string, LangGraphCheckpointRecord>();

/** Per-compound-key mutex tail for strict serialization of checkpoint mutations. */
const langGraphLockChains = new Map<string, Promise<void>>();

function compoundKey(id: string, tenant_id: string): string {
  return `${tenant_id}::${id}`;
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

export function resetLangGraphCheckpointStore(): void {
  store.clear();
  langGraphLockChains.clear();
}

export const db = {
  /**
   * Run a read–modify–write on one checkpoint without overlapping another on the same (id, tenant).
   */
  withSerializedCheckpoint: withSerializedCheckpoint,

  langGraphCheckpoints: {
    findUnique({
      where,
    }: {
      where: { id: string; tenant_id: string };
    }): Promise<LangGraphCheckpointRecord | null> {
      const row = store.get(compoundKey(where.id, where.tenant_id));
      return Promise.resolve(row ? { ...row, payload: { ...row.payload } } : null);
    },

    create({ data }: { data: Partial<LangGraphCheckpointRecord> & { id: string; tenant_id: string } }): Promise<LangGraphCheckpointRecord> {
      const k = compoundKey(data.id, data.tenant_id);
      if (store.has(k)) {
        return Promise.reject(new Error(`LangGraphCheckpoint already exists: ${k}`));
      }
      const row = normalizeCreate(data);
      store.set(k, row);
      return Promise.resolve({ ...row, payload: { ...row.payload } });
    },

    upsert({
      where,
      create,
      update,
    }: {
      where: { id: string; tenant_id: string };
      create: Partial<LangGraphCheckpointRecord> & { id: string; tenant_id: string };
      update: Partial<Pick<LangGraphCheckpointRecord, "persisted_state" | "step" | "ale_impact" | "status">>;
    }): Promise<LangGraphCheckpointRecord> {
      const k = compoundKey(where.id, where.tenant_id);
      const existing = store.get(k);
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
      store.set(k, next);
      return Promise.resolve({ ...next, payload: { ...next.payload } });
    },

    /** Replace row after optimistic validation (use inside `withSerializedCheckpoint`). */
    _replace(row: LangGraphCheckpointRecord): Promise<LangGraphCheckpointRecord> {
      store.set(compoundKey(row.id, row.tenant_id), {
        ...row,
        payload: { ...row.payload },
      });
      return Promise.resolve({ ...row, payload: { ...row.payload } });
    },
  },
};
