export type AuditActionType = "LOGIN" | "CONFIG_CHANGE" | "EMAIL_SENT" | "ALERT_DISMISSED";
export type AuditLogType = "GRC" | "APP_SYSTEM" | "SERVER" | "TELEMETRY";

export type AuditLogRecord = Readonly<{
  id: string;
  timestamp: string;
  user_id: string;
  action_type: AuditActionType;
  log_type: AuditLogType;
  metadata_tag: string | null;
  description: string;
  ip_address: string;
}>;

type CreateAuditLogInput = {
  action_type: AuditActionType;
  description: string;
  log_type?: AuditLogType;
  metadata_tag?: string | null;
  user_id?: string;
  ip_address?: string;
  timestamp?: string;
};

const AUDIT_LOG_STORAGE_KEY = "ironframe-audit-intelligence-log-v1";
const DEFAULT_USER_ID = "Dereck";
const DEFAULT_IP = "127.0.0.1";

const listeners = new Set<() => void>();

let auditLogState: ReadonlyArray<AuditLogRecord> = Object.freeze([]) as ReadonlyArray<AuditLogRecord>;

function deepFreezeLog(record: Omit<AuditLogRecord, "id"> & { id?: string }) {
  return Object.freeze({
    id: record.id ?? `audit-${record.timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: record.timestamp,
    user_id: record.user_id,
    action_type: record.action_type,
    log_type: record.log_type,
    metadata_tag: record.metadata_tag,
    description: record.description,
    ip_address: record.ip_address,
  }) satisfies AuditLogRecord;
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

function persistAuditLogState() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(auditLogState));
}

export function hydrateAuditLogger() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const raw = window.localStorage.getItem(AUDIT_LOG_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as Array<Partial<AuditLogRecord>>;
    const safeLogs = parsed
      .filter((entry) => Boolean(entry?.timestamp) && Boolean(entry?.description) && Boolean(entry?.action_type))
      .map((entry) =>
        deepFreezeLog({
          id: entry.id,
          timestamp: String(entry.timestamp),
          user_id: String(entry.user_id ?? DEFAULT_USER_ID),
          action_type: entry.action_type as AuditActionType,
          log_type: (entry.log_type as AuditLogType | undefined) ?? "APP_SYSTEM",
          metadata_tag: entry.metadata_tag ? String(entry.metadata_tag) : null,
          description: String(entry.description),
          ip_address: String(entry.ip_address ?? DEFAULT_IP),
        }),
      );

    auditLogState = Object.freeze(safeLogs);
    emitChange();
  } catch (error) {
    console.error("AUDIT_LOGGER_HYDRATE_FAILED", error);
  }
}

export function appendAuditLog(input: CreateAuditLogInput) {
  const timestamp = input.timestamp ?? new Date().toISOString();

  const nextRecord = deepFreezeLog({
    timestamp,
    user_id: input.user_id ?? DEFAULT_USER_ID,
    action_type: input.action_type,
    log_type: input.log_type ?? "APP_SYSTEM",
    metadata_tag: input.metadata_tag ?? null,
    description: input.description,
    ip_address: input.ip_address ?? DEFAULT_IP,
  });

  auditLogState = Object.freeze([nextRecord, ...auditLogState].slice(0, 2000));
  persistAuditLogState();
  emitChange();
  return nextRecord;
}

export function ensureLoginAuditEvent() {
  const todayKey = new Date().toISOString().slice(0, 10);
  const hasLoginToday = auditLogState.some(
    (entry) => entry.action_type === "LOGIN" && entry.timestamp.slice(0, 10) === todayKey,
  );

  if (hasLoginToday) {
    return;
  }

  appendAuditLog({
    action_type: "LOGIN",
    description: "User session authenticated.",
  });
}

export function purgeExpiredAuditLogs(ttlDays: number, nowMs = Date.now()) {
  const ttlMs = ttlDays * 24 * 60 * 60 * 1000;
  const beforeCount = auditLogState.length;
  const grcBeforeCount = auditLogState.filter((entry) => entry.log_type === "GRC").length;

  const retained = auditLogState.filter((entry) => {
    if (entry.log_type === "GRC") {
      return true;
    }

    const ageMs = nowMs - new Date(entry.timestamp).getTime();
    return !Number.isNaN(ageMs) && ageMs <= ttlMs;
  });

  const grcAfterCount = retained.filter((entry) => entry.log_type === "GRC").length;

  auditLogState = Object.freeze(retained);
  persistAuditLogState();
  emitChange();

  return {
    beforeCount,
    afterCount: retained.length,
    purgedCount: beforeCount - retained.length,
    grcBeforeCount,
    grcAfterCount,
    grcPurgedCount: grcBeforeCount - grcAfterCount,
  };
}

export function getAuditLogSnapshot() {
  return auditLogState;
}

export function getAuditLogs() {
  return auditLogState.slice(0, 2000);
}

export function subscribeAuditLogger(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
