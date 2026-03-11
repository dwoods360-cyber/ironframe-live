export type AuditActionType =
  | "LOGIN"
  | "CONFIG_CHANGE"
  | "EMAIL_SENT"
  | "ALERT_DISMISSED"
  // GRC / triage-specific actions
  | "GRC_ACKNOWLEDGE_CLICK"
  | "GRC_DEACKNOWLEDGE_CLICK"
  | "GRC_PROCESS_THREAT"
  | "GRC_SET_TTL"
  | "GRC_DECREMENT_TTL"
  | "GRC_SENTINEL_SWEEP"
  | "GRC_VENDOR_ARTIFACT_SUBMIT"
  | "RISK_REGISTRATION_MANUAL"
  // CoreIntel / drawer
  | "AI_REPORT_SAVED"
  | "NOTE_ADDED"
  // Red team / KIMBOT
  | "RED_TEAM_SIMULATION_START"
  | "RED_TEAM_SIMULATION_STOP"
  // Sprint / release
  | "SPRINT_CLOSE"
  | "EXPORT_PDF"
  // GRC directive: De-Ack / Reject / ghost handling
  | "STATE_REGRESSION"
  | "RISK_REJECTED"
  | "SYSTEM_WARNING"
  | "TIME_TO_TRIAGE";
export type AuditLogType = "GRC" | "APP_SYSTEM" | "SERVER" | "TELEMETRY" | "SIMULATION";

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

export type CreateAuditLogInput = {
  id?: string;
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
  if (input.id && auditLogState.some((entry) => entry.id === input.id)) {
    return auditLogState.find((entry) => entry.id === input.id)!;
  }

  const nextRecord = deepFreezeLog({
    id: input.id,
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

/** Remove all audit log entries with log_type === "SIMULATION". Persists and notifies subscribers. */
export function purgeSimulationAuditLogs(): number {
  const beforeCount = auditLogState.length;
  const retained = auditLogState.filter((entry) => entry.log_type !== "SIMULATION");
  auditLogState = Object.freeze(retained);
  persistAuditLogState();
  emitChange();
  return beforeCount - retained.length;
}

/** Clear all audit log entries (e.g. after Deep Purge). Resets Historical Entries to 0 so UI shows [ WAITING FOR TELEMETRY... ]. */
export function clearAllAuditLogs(): number {
  const beforeCount = auditLogState.length;
  auditLogState = Object.freeze([]);
  persistAuditLogState();
  emitChange();
  return beforeCount;
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

/** Return logs filtered by companyId when provided (matches metadata_tag containing companyId). */
export function getAuditLogsForCompany(companyId: string | null | undefined): AuditLogRecord[] {
  const logs = auditLogState.slice(0, 2000);
  if (!companyId) return logs;
  const key = companyId.toLowerCase();
  return logs.filter(
    (entry) =>
      (entry.metadata_tag && entry.metadata_tag.toLowerCase().includes(key)) ||
      (entry.description && entry.description.toLowerCase().includes(key))
  );
}

export function subscribeAuditLogger(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
