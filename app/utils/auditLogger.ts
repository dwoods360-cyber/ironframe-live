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
  | "TIME_TO_TRIAGE"
  | "OPERATIONAL_DEFICIENCY_REPORT"
  | "OPERATIONAL_DEFICIENCY_RESOLVED"
  | "OPERATIONAL_SELF_TEST_PASS"
  | "CHAOS_CONSTITUTIONAL_COLLAPSE"
  | "USER_INTERACTION_CLICK"
  | "SECURITY_THREAT_INTERCEPTED"
  | "INTERRUPT_CONTAINMENT_DEPLOYED"
  | "CHAOS_AGENT_TELEMETRY";
export type AuditLogType = "GRC" | "APP_SYSTEM" | "SERVER" | "TELEMETRY" | "SIMULATION";

/** Battlefield protocol — drives Audit Intelligence chroma + adversarial tagging. */
export type ForensicEventLevel = "blue_team" | "red_team" | "system";

export type ForensicMetadataInput = {
  /** Canonical actor: IRONGUARD, IRONLOCK, ACTOR:KIM, CHAOS_L5, … */
  sourceName: string;
  eventLevel: ForensicEventLevel;
  /** Payload only — appendAuditLog wraps into #[SEQ] | SOURCE | ICON | MSG | TS */
  message: string;
  statusIcon?: string;
};

export type AuditLogRecord = Readonly<{
  id: string;
  timestamp: string;
  user_id: string;
  action_type: AuditActionType;
  log_type: AuditLogType;
  metadata_tag: string | null;
  description: string;
  ip_address: string;
  /** Monotonic GRC ledger sequence (resets on Master Purge via `clearAuditLedgerMasterPurge`). */
  ledger_sequence?: number;
  /** Identity-aware battlefield metadata (optional on legacy hydrated rows). */
  forensic_source_name?: string;
  forensic_event_level?: ForensicEventLevel;
}>;

export type CreateAuditLogInput = {
  id?: string;
  action_type: AuditActionType;
  /** Legacy body; ignored when `forensic` is set (use `forensic.message`). */
  description?: string;
  forensic?: ForensicMetadataInput;
  log_type?: AuditLogType;
  metadata_tag?: string | null;
  user_id?: string;
  ip_address?: string;
  timestamp?: string;
};

import { appendClockDriftToMetadataTag } from "@/app/utils/sessionClockDrift";
import { isShadowPlaneActiveClient } from "@/app/utils/shadowPlaneActive";
import { signalAgentTelemetryFromText } from "@/app/utils/agentTelemetryPulseClient";
import { dispatchIroncastNotificationFromAudit } from "@/app/utils/ironcastNotificationBridge";

const AUDIT_LOG_STORAGE_KEY = "ironframe-audit-intelligence-log-v1";
const DEFAULT_USER_ID = "Dereck";
const DEFAULT_IP = "127.0.0.1";

const listeners = new Set<() => void>();

let auditLogState: ReadonlyArray<AuditLogRecord> = Object.freeze([]) as ReadonlyArray<AuditLogRecord>;

function deepFreezeLog(record: Omit<AuditLogRecord, "id"> & { id?: string }) {
  const seq =
    typeof record.ledger_sequence === "number" && Number.isFinite(record.ledger_sequence)
      ? Math.floor(record.ledger_sequence)
      : undefined;
  const src = record.forensic_source_name?.trim();
  const lvl = record.forensic_event_level;
  return Object.freeze({
    id: record.id ?? `audit-${record.timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: record.timestamp,
    user_id: record.user_id,
    action_type: record.action_type,
    log_type: record.log_type,
    metadata_tag: record.metadata_tag,
    description: record.description,
    ip_address: record.ip_address,
    ...(seq != null && seq > 0 ? { ledger_sequence: seq } : {}),
    ...(src ? { forensic_source_name: src } : {}),
    ...(lvl ? { forensic_event_level: lvl } : {}),
  }) satisfies AuditLogRecord;
}

function defaultIconForLevel(level: ForensicEventLevel): string {
  if (level === "blue_team") return "●";
  if (level === "red_team") return "⚠";
  return "◆";
}

function inferLegacyForensic(input: CreateAuditLogInput & { description: string }): ForensicMetadataInput {
  const desc = input.description;
  const tag = (input.metadata_tag ?? "").toUpperCase();
  const uid = (input.user_id ?? "").toUpperCase();
  let sourceName = "SYSTEM";
  let eventLevel: ForensicEventLevel = "system";

  if (tag.includes("IRONGUARD") || tag.includes("SENTINEL") || uid.includes("IRONGUARD")) {
    sourceName = "IRONGUARD";
    eventLevel =
      tag.includes("SENTINEL") || input.action_type === "SYSTEM_WARNING" ? "red_team" : "blue_team";
  } else if (tag.includes("HANDSHAKE") || tag.includes("GRC_HANDSHAKE")) {
    sourceName = "HANDSHAKE";
    eventLevel = "system";
  } else if (
    tag.includes("KIMBOT") ||
    tag.includes("ATTACK_BOT") ||
    tag.includes("IRONCHAOS") ||
    desc.includes("[KIMBOT]") ||
    desc.includes("KIMBOT")
  ) {
    sourceName = "ACTOR:KIM";
    eventLevel = "red_team";
  } else if (tag.includes("CHAOS5") || tag.includes("CHAOS_L5") || desc.includes("CHAOS 5")) {
    sourceName = "CHAOS_L5";
    eventLevel = "red_team";
  } else if (input.action_type === "EXPORT_PDF") {
    sourceName = "IRONSCRIBE";
    eventLevel = "blue_team";
  } else if (input.log_type === "GRC" || String(input.action_type).startsWith("GRC_")) {
    sourceName = "GRC_OPS";
    eventLevel = "blue_team";
  }

  const statusIcon = defaultIconForLevel(eventLevel);
  return { sourceName, eventLevel, message: desc, statusIcon };
}

/** #[SEQ] | SOURCE | ICON | MESSAGE | TIMESTAMP */
export function formatBattlefieldLogLine(
  seq: number,
  forensic: ForensicMetadataInput,
  timestampIso: string,
): string {
  const seqLabel = formatLedgerSequenceLabel(seq);
  const src = forensic.sourceName.trim().replace(/\s+/g, "_").toUpperCase();
  const icon = (forensic.statusIcon ?? defaultIconForLevel(forensic.eventLevel)).trim() || "◆";
  const msg = forensic.message.trim();
  return `${seqLabel} | ${src} | ${icon} | ${msg} | ${timestampIso}`;
}

/** Next sequence: max stored `ledger_sequence` + 1 (empty ledger → 1). Master purge clears → #001. */
function computeNextLedgerSequence(): number {
  let maxSeq = 0;
  for (const e of auditLogState) {
    if (typeof e.ledger_sequence === "number" && Number.isFinite(e.ledger_sequence)) {
      maxSeq = Math.max(maxSeq, Math.floor(e.ledger_sequence));
    }
  }
  return maxSeq + 1;
}

/** Display prefix for Audit Intelligence / exports (e.g. `#042`). */
export function formatLedgerSequenceLabel(seq: number): string {
  return `#${String(Math.max(0, Math.floor(seq))).padStart(3, "0")}`;
}

function emitChange() {
  /** Defer subscriber notifications to avoid updating React trees during synchronous append/hydrate. */
  const notify = () => {
    listeners.forEach((listener) => listener());
  };
  if (typeof queueMicrotask === "function") {
    queueMicrotask(notify);
  } else {
    setTimeout(notify, 0);
  }
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
          ledger_sequence:
            typeof entry.ledger_sequence === "number" && Number.isFinite(entry.ledger_sequence)
              ? Math.floor(entry.ledger_sequence)
              : undefined,
          forensic_source_name:
            typeof (entry as { forensic_source_name?: string }).forensic_source_name === "string"
              ? String((entry as { forensic_source_name?: string }).forensic_source_name)
              : undefined,
          forensic_event_level: (() => {
            const v = (entry as { forensic_event_level?: ForensicEventLevel }).forensic_event_level;
            if (v === "blue_team" || v === "red_team" || v === "system") return v;
            return undefined;
          })(),
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

  if (!input.forensic && (input.description == null || String(input.description).trim() === "")) {
    throw new Error("appendAuditLog: provide `forensic.message` or non-empty `description`.");
  }

  const seq = computeNextLedgerSequence();

  let forensicResolved: ForensicMetadataInput;
  let forensicSourceOut: string;
  let forensicLevelOut: ForensicEventLevel;

  if (input.forensic) {
    forensicResolved = {
      sourceName: input.forensic.sourceName.trim(),
      eventLevel: input.forensic.eventLevel,
      message: input.forensic.message.trim(),
      statusIcon: input.forensic.statusIcon ?? defaultIconForLevel(input.forensic.eventLevel),
    };
    forensicSourceOut = forensicResolved.sourceName.toUpperCase();
    forensicLevelOut = forensicResolved.eventLevel;
  } else {
    const inferred = inferLegacyForensic({
      ...input,
      description: String(input.description ?? "").trim(),
    });
    forensicResolved = inferred;
    forensicSourceOut = inferred.sourceName.toUpperCase();
    forensicLevelOut = inferred.eventLevel;
  }

  const description = formatBattlefieldLogLine(seq, forensicResolved, timestamp);

  const nextRecord = deepFreezeLog({
    id: input.id,
    timestamp,
    user_id: input.user_id ?? DEFAULT_USER_ID,
    action_type: input.action_type,
    log_type: input.log_type ?? "APP_SYSTEM",
    metadata_tag: appendClockDriftToMetadataTag(input.metadata_tag),
    description,
    ip_address: input.ip_address ?? DEFAULT_IP,
    ledger_sequence: seq,
    forensic_source_name: forensicSourceOut,
    forensic_event_level: forensicLevelOut,
  });

  auditLogState = Object.freeze([nextRecord, ...auditLogState].slice(0, 2000));
  persistAuditLogState();
  emitChange();
  signalAgentTelemetryFromText(
    [description, forensicSourceOut, input.metadata_tag ?? "", input.forensic?.message ?? ""].join(" "),
  );
  dispatchIroncastNotificationFromAudit(input);
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

export type ClearAuditLogsOptions = {
  /** Must be `true` from Audit Intelligence Master Purge confirm — bypasses shadow-plane retention (simulation logs persist otherwise). */
  masterPurge?: boolean;
};

function wipeLocalAuditLedger(): number {
  const beforeCount = auditLogState.length;
  auditLogState = Object.freeze([]);
  persistAuditLogState();
  emitChange();
  return beforeCount;
}

/**
 * Clears the local forensic buffer. With `{ masterPurge: true }`, bypasses shadow-plane retention (Audit Intelligence only).
 * Without `masterPurge`, no-ops while simulation / shadow plane is active so tenant switches do not wipe simulation trails.
 */
export function clearAllAuditLogs(options?: ClearAuditLogsOptions): number {
  const masterPurge = options?.masterPurge === true;
  if (!masterPurge && isShadowPlaneActiveClient()) {
    return auditLogState.length;
  }
  return wipeLocalAuditLedger();
}

/** Alias for `clearAllAuditLogs({ masterPurge: true })` — tests and legacy callers. */
export function clearAuditLedgerMasterPurge(): number {
  return clearAllAuditLogs({ masterPurge: true });
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
