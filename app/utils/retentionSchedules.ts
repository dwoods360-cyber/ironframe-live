import { getAuditLogs } from "./auditLogger";

export const AUDIT_INTELLIGENCE_TTL_DAYS = 2555;
export const SYSTEM_DATA_TTL_DAYS = 45;

type SystemDataCategory = "HEARTBEAT" | "PORT_LOG" | "DEBUG_NOISE" | "TELEMETRY";
type SystemDataTag = "system_log" | "audit_intelligence";

type SystemDataRecord = {
  id: string;
  category: SystemDataCategory;
  tag: SystemDataTag;
  timestamp: string;
  details: string;
};

let systemDataState: SystemDataRecord[] = [
  {
    id: "sys-old-heartbeat",
    category: "HEARTBEAT",
    tag: "system_log",
    timestamp: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
    details: "Legacy heartbeat entry older than 45 days.",
  },
  {
    id: "sys-old-portlog",
    category: "PORT_LOG",
    tag: "system_log",
    timestamp: new Date(Date.now() - 67 * 24 * 60 * 60 * 1000).toISOString(),
    details: "Legacy port log older than 45 days.",
  },
  {
    id: "sys-old-debug",
    category: "DEBUG_NOISE",
    tag: "system_log",
    timestamp: new Date(Date.now() - 49 * 24 * 60 * 60 * 1000).toISOString(),
    details: "Legacy debug noise older than 45 days.",
  },
  {
    id: "sys-old-audit-intel",
    category: "TELEMETRY",
    tag: "audit_intelligence",
    timestamp: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
    details: "Audit intelligence evidence retained under 7-year policy.",
  },
  {
    id: "sys-recent-heartbeat",
    category: "HEARTBEAT",
    tag: "system_log",
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    details: "Recent heartbeat retained by policy.",
  },
];

let lastSystemPurgeAt: string | null = null;

export function addSystemDataRecord(record: Omit<SystemDataRecord, "id"> & { id?: string }) {
  const next: SystemDataRecord = {
    id: record.id ?? `sys-${record.category.toLowerCase()}-${Date.now()}`,
    category: record.category,
    tag: record.tag,
    timestamp: record.timestamp,
    details: record.details,
  };

  systemDataState = [next, ...systemDataState].slice(0, 5000);
  return next;
}

export function getSystemDataSnapshot() {
  return {
    records: systemDataState.slice(0, 5000),
    lastSystemPurgeAt,
  };
}

export function purgeExpiredData(nowMs = Date.now()) {
  const systemTtlMs = SYSTEM_DATA_TTL_DAYS * 24 * 60 * 60 * 1000;
  const beforeSystemCount = systemDataState.length;
  const auditBefore = getAuditLogs();
  const auditBeforeCount = auditBefore.length;
  const grcAuditBeforeCount = auditBefore.filter((entry) => entry.log_type === "GRC").length;

  systemDataState = systemDataState.filter((entry) => {
    if (entry.tag !== "system_log") {
      return true;
    }

    const ageMs = nowMs - new Date(entry.timestamp).getTime();
    return !Number.isNaN(ageMs) && ageMs <= systemTtlMs;
  });

  const afterSystemCount = systemDataState.length;
  lastSystemPurgeAt = new Date(nowMs).toISOString();

  const staleSystemLogCount = systemDataState.filter((entry) => {
    if (entry.tag !== "system_log") {
      return false;
    }

    const ageMs = nowMs - new Date(entry.timestamp).getTime();
    return !Number.isNaN(ageMs) && ageMs > systemTtlMs;
  }).length;

  const auditTaggedCount = systemDataState.filter((entry) => entry.tag === "audit_intelligence").length;
  const auditAfter = getAuditLogs();
  const auditAfterCount = auditAfter.length;
  const grcAuditAfterCount = auditAfter.filter((entry) => entry.log_type === "GRC").length;

  return {
    ranAt: lastSystemPurgeAt,
    systemData: {
      beforeCount: beforeSystemCount,
      afterCount: afterSystemCount,
      purgedCount: beforeSystemCount - afterSystemCount,
      staleSystemLogCount,
      auditTaggedCount,
      ttlDays: SYSTEM_DATA_TTL_DAYS,
    },
    auditIntelligence: {
      beforeCount: auditBeforeCount,
      afterCount: auditAfterCount,
      purgedCount: 0,
      ttlDays: AUDIT_INTELLIGENCE_TTL_DAYS,
      grcBeforeCount: grcAuditBeforeCount,
      grcAfterCount: grcAuditAfterCount,
      grcPurgedCount: grcAuditBeforeCount - grcAuditAfterCount,
    },
  };
}
