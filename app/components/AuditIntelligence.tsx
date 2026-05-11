"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useMemo, type MouseEvent } from "react";
import { Copy, ExternalLink, Folder, Info, Printer, Trash2 } from "lucide-react";
import {
  appendAuditLog,
  clearAllAuditLogs,
  ensureLoginAuditEvent,
  formatLedgerSequenceLabel,
  getAuditLogs,
  hydrateAuditLogger,
  purgeSimulationAuditLogs,
  type AuditLogType,
  type AuditActionType,
  type ForensicEventLevel,
} from "@/app/utils/auditLogger";
import {
  buildAuditPdf,
  computeRiskSummary,
  getFilteredAuditLogsForReport,
} from "@/app/utils/exportAudit";
import { getSessionClockDriftMs } from "@/app/utils/sessionClockDrift";
import { useAuditLoggerStore } from "@/app/utils/auditLoggerStore";
import { useRiskStore } from "@/app/store/riskStore";
import { useAgentStore } from "@/app/store/agentStore";
import { useSystemConfigStore } from "@/app/store/systemConfigStore";
import {
  assigneeKeyToDisplayName,
  operatorIdToDisplayName,
  parseAssignmentJustification,
} from "@/app/utils/assignmentChainOfCustody";
import { DEFENSE_REGULATORY_SHIELD_BADGE_LABEL } from "@/lib/constants/grcGovernance";
import { useTenantContext } from "@/app/context/TenantProvider";
import { DEV_TENANT_CONTROL_CHIPS } from "@/app/constants/devTenantRoster";
import { getTotalCurrentRiskCentsString } from "@/app/utils/riskStoreBigIntMath";
import { formatAleEngineManifestLine, formatBaselineDriftManifestParts } from "@/app/utils/baselineDriftManifest";
import type { OpSupportSimAuditRow } from "@/app/lib/opsupportDashTypes";
import { isShadowPlaneActiveClient } from "@/app/utils/shadowPlaneActive";
import { resolveDashboardTenantUuid } from "@/app/utils/clientTenantCookie";
import { fireAdversarialSalvoServerAction } from "@/app/actions/simulationActions";
import {
  getPostMortemSummaryAction,
  type PostMortemSummary,
} from "@/app/actions/postMortemActions";

// # AUDIT_STREAM_LOGIC (Real-time log mapping) — buildListItems, clientFiltered, listItems, filteredAuditLogs, hasAnyLogs

/** Server-fetched audit log row (from prisma.auditLog). Pass from page so router.refresh() brings new entries. */
export type ServerAuditLogRow = {
  id: string;
  action: string;
  operatorId: string;
  createdAt: Date;
  threatId: string | null;
  justification?: string | null;
};

type AuditIntelligenceProps = {
  showRetentionBadge?: boolean;
  logTypeFilter?: AuditLogType;
  descriptionIncludes?: string[];
  /** When set, only show entries for this company (metadata_tag or description contains companyId). */
  companyId?: string | null;
  /** DB audit logs from the server. When provided, merged with client logs so sidebar updates after router.refresh(). */
  serverAuditLogs?: ServerAuditLogRow[];
  /** When provided, clicking a threat-related entry opens the drawer and optionally focuses a section (e.g. "ai-report", "analyst-notes"). */
  onOpenThreat?: (threatId: string, focus?: string) => void;
  /** Tenant `governance_multiplier` presentation (bps → ×), from `getTenantGovernanceMultiplierBps`. */
  tenantGovernanceBps?: number | null;
};

const ACTION_LABELS: Partial<Record<AuditActionType, string>> = {
  LOGIN: "Login",
  CONFIG_CHANGE: "Config Change",
  EMAIL_SENT: "Email Sent",
  ALERT_DISMISSED: "Alert Dismissed",
  GRC_ACKNOWLEDGE_CLICK: "GRC Acknowledge",
  GRC_DEACKNOWLEDGE_CLICK: "GRC De-Acknowledge",
  GRC_PROCESS_THREAT: "GRC Process Threat",
  GRC_SET_TTL: "GRC Set TTL",
  GRC_DECREMENT_TTL: "GRC Decrement TTL",
  GRC_SENTINEL_SWEEP: "Sentinel Sweep",
  GRC_VENDOR_ARTIFACT_SUBMIT: "Vendor Artifact Submit",
  RISK_REGISTRATION_MANUAL: "Manual Risk Registration",
  AI_REPORT_SAVED: "AI Report Saved",
  NOTE_ADDED: "Note Added",
  EXPORT_PDF: "PDF Exported",
  RED_TEAM_SIMULATION_START: "Simulation Start",
  RED_TEAM_SIMULATION_STOP: "Simulation Stop",
  SPRINT_CLOSE: "Sprint Close",
  // # AUDIT_STREAM_LOGIC — GRC directive De-Ack / Reject / ghost
  STATE_REGRESSION: "State Regression",
  RISK_REJECTED: "Risk Rejected",
  SYSTEM_WARNING: "System Warning",
  OPERATIONAL_DEFICIENCY_REPORT: "Operational deficiency",
  OPERATIONAL_DEFICIENCY_RESOLVED: "Deficiency resolved",
  OPERATIONAL_SELF_TEST_PASS: "Self-test pass",
};

const SERVER_ACTION_LABELS: Record<string, string> = {
  THREAT_ACKNOWLEDGED: "Acknowledged",
  THREAT_DE_ACKNOWLEDGED: "De-Acknowledged",
  THREAT_DEACKNOWLEDGED: "De-Acknowledged",
  THREAT_CONFIRMED: "Confirmed",
  HANDOFF_INITIATED: "Handoff",
  ATTESTATION_SUBMITTED: "Attestation submitted",
  THREAT_RESOLVED: "Resolved",
  TTL_CHANGED: "TTL Changed",
  AI_REPORT_SAVED: "AI Report Saved",
  NOTES_ADDED: "Notes Added",
  NOTE_ADDED: "Note Added",
  STATE_REGRESSION: "State Regression",
  RISK_REJECTED: "Risk Rejected",
  SYSTEM_WARNING: "System Warning",
  OPERATIONAL_DEFICIENCY_REPORT: "Operational deficiency",
  OPERATIONAL_DEFICIENCY_RESOLVED: "Deficiency resolved",
  OPERATIONAL_SELF_TEST_PASS: "Self-test pass",
  CHAIN_OF_CUSTODY: "Chain of custody",
  EXPERT_AUTHORITY_SCOPED: "Authority scoped",
  EXPERT_CUSTODY_DECISION: "Custody decision",
  AGENT_PIVOT: "[AGENT_PIVOT] Strategy shifted due to new telemetry",
};

function formatServerLogForDisplay(row: ServerAuditLogRow): { id: string; timestamp: string; user_id: string; action_type: string; description: string; _sortTime: number; _fromServer: true; threatId?: string | null; ip_address?: string } {
  const label = SERVER_ACTION_LABELS[row.action] ?? row.action;
  return {
    id: row.id,
    timestamp: typeof row.createdAt === "string" ? row.createdAt : new Date(row.createdAt).toLocaleString(),
    user_id: row.operatorId,
    action_type: row.action,
    description: label + (row.threatId ? ` (threat ${row.threatId.slice(0, 8)}…)` : ""),
    _sortTime: new Date(row.createdAt).getTime(),
    _fromServer: true,
    threatId: row.threatId,
    ip_address: "—",
  };
}

function extractThreatId(input?: string | null): string | null {
  if (!input) return null;
  const match = input.match(/threat(?:_?id)?\s*:\s*([^|,\s)]+)/i);
  const candidate = match?.[1]?.trim();
  if (!candidate) return null;
  // Guard against parsing display text (e.g. "Acknowledged threat: Vendor ...") as an ID.
  const looksLikeId =
    candidate.length >= 6 &&
    /[0-9-]/.test(candidate);
  return looksLikeId ? candidate : null;
}

function extractThreatName(input?: string | null): string | null {
  if (!input) return null;
  const patterns = [
    /Acknowledged threat:\s*([^|]+)$/i,
    /De-acknowledged threat:\s*([^|]+)$/i,
    /Acknowledge failed for threat:\s*([^|]+)$/i,
    /MANUAL RISK REGISTRATION:\s*([^|]+)$/i,
    /INGEST raw signal into RISK INGESTION:\s*([^(|]+)\s*\(/i,
    /DISMISS raw signal from ingestion queue:\s*([^(|]+)\s*\(/i,
  ];
  for (const pattern of patterns) {
    const match = input.match(pattern);
    const candidate = match?.[1]?.trim();
    if (candidate) return candidate;
  }
  return null;
}

/** Single log entry for unified Audit Intelligence log (one line per update). */
type LogEntryItem = {
  id: string;
  _sortTime: number;
  /** Canonical event time for descending sort (server `createdAt` / client log timestamp). */
  createdAt: Date;
  entry: {
    id: string;
    timestamp: string;
    user_id: string;
    action_type: string;
    description: string;
    ip_address?: string;
    threatId?: string | null;
    /** Client audit rows: searchable lineage / correlation (e.g. threat id in tag). */
    metadata_tag?: string | null;
    /** DB `AuditLog.justification` or synthesized client forensic JSON. */
    justification?: string | null;
    /** Client ledger sequence (#001…) — server rows omit until mirrored. */
    ledger_sequence?: number;
    _fromServer?: true;
  };
};

/** Agent 5 (Ironsight): vault jump only when metadata carries sealed evidence pointers. */
function parseJsonObject(raw: string | undefined): Record<string, unknown> | null {
  if (!raw?.trim()) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function recordHasVerifiedVaultPointer(obj: Record<string, unknown>): boolean {
  const doc = obj.document_id ?? obj.documentId ?? obj.verified_document_id ?? obj.verifiedDocumentId;
  const vp = obj.vault_path ?? obj.vaultPath;
  const has = (u: unknown) => typeof u === "string" && u.trim().length > 0;
  return has(doc) || has(vp);
}

/**
 * True when Ironsight-linked metadata includes a non-empty `document_id` / `verified_document_id` or `vault_path`
 * (ingestion JSON or Ironsight agent reasoning rows).
 */
function ironsightVaultEvidencePresent(
  threat: { ingestionDetails?: string; agentReasonings?: Array<{ agentId: string; metadata: unknown }> } | undefined,
): boolean {
  if (!threat) return false;
  for (const ar of threat.agentReasonings ?? []) {
    const aid = ar.agentId.trim();
    if (!/ironsight|agent\s*5|^5$/i.test(aid)) continue;
    const m = ar.metadata;
    if (m && typeof m === "object" && !Array.isArray(m) && recordHasVerifiedVaultPointer(m as Record<string, unknown>)) {
      return true;
    }
  }
  const ing = parseJsonObject(threat.ingestionDetails);
  if (!ing) return false;
  const candidates: unknown[] = [ing, ing.ironsight, ing.Ironsight, ing.ironsight_metadata, ing.aiTrace];
  for (const c of candidates) {
    if (c && typeof c === "object" && !Array.isArray(c) && recordHasVerifiedVaultPointer(c as Record<string, unknown>)) {
      return true;
    }
  }
  return false;
}

/** Merge server + client rows (unsorted). Sorting happens after search filter. */
function mergeUnifiedAuditLogs(
  serverAuditLogs: ServerAuditLogRow[],
  clientWithSort: Array<Record<string, unknown> & { id: string; timestamp?: string; description: string; action_type: string; user_id: string; ip_address?: string; _sortTime?: number }>
): LogEntryItem[] {
  const serverItems: LogEntryItem[] = serverAuditLogs.map((row) => {
    const formatted = formatServerLogForDisplay(row);
    const createdAt = row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt);
    return {
      id: row.id,
      _sortTime: formatted._sortTime,
      createdAt,
      entry: {
        id: formatted.id,
        timestamp: formatted.timestamp,
        user_id: formatted.user_id,
        action_type: formatted.action_type,
        description: formatted.description,
        ip_address: formatted.ip_address ?? "—",
        threatId: formatted.threatId,
        metadata_tag: null,
        justification: row.justification ?? null,
        _fromServer: true,
      },
    };
  });

  const clientItems: LogEntryItem[] = clientWithSort.map((entry) => {
    const desc = (entry.description as string) ?? "";
    const metadata_tag = (entry as { metadata_tag?: string | null }).metadata_tag ?? null;
    const log_type = (entry as { log_type?: string }).log_type ?? null;
    const rawTs = entry._sortTime as number | undefined;
    const ts = typeof rawTs === "number" && Number.isFinite(rawTs) ? rawTs : Date.now();
    const createdAt = new Date(ts);
    const clientJustification = JSON.stringify(
      {
        source: "client_audit_logger",
        action_type: entry.action_type,
        description: desc,
        metadata_tag,
        log_type,
        user_id: entry.user_id,
        ip_address: entry.ip_address,
      },
      null,
      2,
    );
    const ledgerSeq = (entry as { ledger_sequence?: number }).ledger_sequence;
    return {
      id: entry.id,
      _sortTime: ts,
      createdAt,
      entry: {
        id: entry.id,
        timestamp: (entry.timestamp as string) ?? "—",
        user_id: (entry.user_id as string) ?? "—",
        action_type: (entry.action_type as string) ?? "—",
        description: desc,
        ip_address: (entry.ip_address as string) ?? "—",
        threatId:
          extractThreatId((entry as { metadata_tag?: string | null }).metadata_tag) ??
          extractThreatId(desc),
        metadata_tag,
        justification: clientJustification,
        ...(typeof ledgerSeq === "number" && Number.isFinite(ledgerSeq)
          ? { ledger_sequence: Math.floor(ledgerSeq) }
          : {}),
      },
    };
  });

  return [...serverItems, ...clientItems];
}

/** Newest-first after filter; uses canonical `createdAt` (matches server row / client epoch). */
/** DB replay rows from `/api/opsupport/simulation-audit` → unified sidebar shape (time-travel scrub). */
function mapSimReplayToLogItem(row: OpSupportSimAuditRow): LogEntryItem {
  const createdAt = new Date(row.createdAt);
  const ts = createdAt.getTime();
  const id = `db-sim-${row.id}`;
  return {
    id,
    _sortTime: ts,
    createdAt,
    entry: {
      id,
      timestamp: createdAt.toISOString(),
      user_id: row.operatorId,
      action_type: row.action,
      description: row.justificationPreview,
      ip_address: "—",
      threatId: row.threatId,
      metadata_tag: row.isSimulation ? "SIMULATION_DB_REPLAY" : "AUDIT_DB_REPLAY",
      justification: null,
      _fromServer: true,
    },
  };
}

function sortCombinedLogsNewestFirst(combinedLogs: LogEntryItem[]): LogEntryItem[] {
  return [...combinedLogs].sort((a, b) => {
    const delta =
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (delta !== 0) return delta;
    // Same instant: float client/appendAuditLog above server row so new local writes win.
    const aSrv = Boolean(a.entry._fromServer);
    const bSrv = Boolean(b.entry._fromServer);
    if (aSrv !== bSrv) return aSrv ? 1 : -1;
    return String(b.id).localeCompare(String(a.id));
  });
}

function displayLabelForAuditEntry(actionType: string): string {
  const raw = (actionType ?? "").trim();
  return (
    (ACTION_LABELS[raw as AuditActionType] ?? SERVER_ACTION_LABELS[raw] ?? raw) || ""
  );
}

/** Search haystack: human label, raw action, description, entity id (`threatId`), metadata tag. */
function auditEntryMatchesSearch(
  entry: LogEntryItem["entry"],
  searchLower: string,
): boolean {
  if (!searchLower) return true;
  const label = displayLabelForAuditEntry(entry.action_type).toLowerCase();
  const iron = (ironscribeNarrativeFromJustification(entry.justification) ?? "").toLowerCase();
  const meta = ((entry as { metadata_tag?: string | null }).metadata_tag ?? "").toLowerCase();
  const entityId = (entry.threatId ?? "").toLowerCase();
  const seq = (entry as { ledger_sequence?: number }).ledger_sequence;
  const seqHay =
    typeof seq === "number" && Number.isFinite(seq)
      ? formatLedgerSequenceLabel(seq).toLowerCase()
      : "";
  const haystack = [
    label,
    iron,
    (entry.action_type ?? "").toLowerCase(),
    (entry.description ?? "").toLowerCase(),
    entityId,
    meta,
    (entry.justification ?? "").toLowerCase(),
    seqHay,
  ].join(" ");
  return haystack.includes(searchLower);
}

/** Stringified JSON of the full audit entry for clipboard (Task 4). */
function buildForensicEntryJson(item: LogEntryItem): string {
  const e = item.entry;
  let justificationParsed: unknown = e.justification ?? null;
  const j = e.justification?.trim();
  if (
    j &&
    ((j.startsWith("{") && j.endsWith("}")) || (j.startsWith("[") && j.endsWith("]")))
  ) {
    try {
      justificationParsed = JSON.parse(j);
    } catch {
      justificationParsed = e.justification;
    }
  }
  const utcIso = item.createdAt.toISOString();
  const drift = getSessionClockDriftMs();
  return JSON.stringify(
    {
      id: e.id,
      timestamp: e.timestamp,
      /** Canonical UTC instant for GRC / legal correlation (ISO-8601) */
      utc_iso_8601: utcIso,
      /** Client vs server RSC clock skew (ms) measured at session ClockDriftBanner mount; null if not yet sampled. */
      forensic_session_clock_drift_ms: drift,
      ...(typeof (e as { ledger_sequence?: number }).ledger_sequence === "number"
        ? {
            ledger_sequence: (e as { ledger_sequence?: number }).ledger_sequence,
            ledger_sequence_display: formatLedgerSequenceLabel(
              (e as { ledger_sequence?: number }).ledger_sequence!,
            ),
          }
        : {}),
      action_type: e.action_type,
      description: e.description,
      user_id: e.user_id,
      ip_address: e.ip_address ?? null,
      threatId: e.threatId ?? null,
      metadata_tag: e.metadata_tag ?? null,
      justification: justificationParsed,
      source: (e as { _fromServer?: true })._fromServer ? "server" : "client",
    },
    null,
    2,
  );
}

function safeParseJustificationRecord(raw: string | null | undefined): Record<string, unknown> | null {
  const t = raw?.trim();
  if (!t?.startsWith("{")) return null;
  try {
    const v = JSON.parse(t) as unknown;
    return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Prefer Ironscribe clerk line when embedded in audit justification JSON. */
function ironscribeNarrativeFromJustification(raw: string | null | undefined): string | null {
  const p = safeParseJustificationRecord(raw);
  const n = p?.ironscribeNarrative;
  return typeof n === "string" && n.trim() !== "" ? n.trim() : null;
}

function truncateAuditSidebarLine(text: string, maxChars = 160): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars - 1)}…`;
}

/** Battlefield protocol line — full #[SEQ] | SOURCE | … single row. */
function auditBattlefieldPrimaryLine(entry: LogEntryItem["entry"]): string {
  const d = (entry.description ?? "").trim();
  if (/^#\d{3}\s*\|/.test(d)) return truncateAuditSidebarLine(d, 320);
  const iron = ironscribeNarrativeFromJustification(entry.justification);
  if (iron) return truncateAuditSidebarLine(iron);
  return truncateAuditSidebarLine(
    `${ACTION_LABELS[entry.action_type as AuditActionType] ?? entry.action_type}${d ? ` — ${d.slice(0, 140)}` : ""}`,
  );
}

function auditRowForensicClass(entry: LogEntryItem["entry"]): string {
  const lvl = (entry as { forensic_event_level?: ForensicEventLevel }).forensic_event_level;
  if (lvl === "red_team") {
    return "drop-shadow-[0_0_8px_rgba(248,113,113,0.45)] text-rose-100";
  }
  if (lvl === "blue_team") {
    return "drop-shadow-[0_0_6px_rgba(16,185,129,0.28)] text-cyan-100";
  }
  return "text-slate-400";
}

function auditRowForensicBorderClass(entry: LogEntryItem["entry"]): string {
  const lvl = (entry as { forensic_event_level?: ForensicEventLevel }).forensic_event_level;
  if (lvl === "red_team") return "border-l-rose-500/55 hover:border-rose-400/75";
  if (lvl === "blue_team") return "border-l-emerald-400/45 hover:border-cyan-400/65";
  return "border-l-slate-700/90 hover:border-slate-500/50";
}

/** True when primary line already embeds #[SEQ] | … (avoid duplicate ledger chip). */
function auditPrimaryLineHasLedgerSeq(primary: string): boolean {
  return /^#\d{3}\s*\|/.test(primary.trim());
}

/** Estimated row height for virtualized audit feed (time strip + 2-line clamp + actor). */
const AUDIT_LOG_ROW_EST_PX = 72;
const AUDIT_LOG_VIRTUAL_OVERSCAN = 8;

/** Display name for structured lifecycle JSON (Irontech chaos, etc.); falls back to operator display. */
function resolveForensicIdentityFromJustification(
  parsed: Record<string, unknown> | null,
  fallbackDisplay: string,
): string {
  if (!parsed) return fallbackDisplay;
  const a = parsed.actor;
  if (typeof a === "string" && a.trim()) return a.trim();
  const name = parsed.agentName;
  const title = parsed.agentTitle;
  if (typeof name === "string" && name.trim()) {
    const nt = typeof title === "string" && title.trim() ? title.trim() : "";
    return nt ? `${name.trim()} (${nt})` : name.trim();
  }
  return fallbackDisplay;
}

/** True when justification carries chaos lifecycle / agent identity fields (not plain assignment blobs). */
function justificationSupportsLifecycleNarrative(parsed: Record<string, unknown> | null): boolean {
  if (!parsed) return false;
  const g = parsed.gate;
  if (typeof g === "number" && g >= 1 && g <= 4) return true;
  const n = parsed.agentName;
  const t = parsed.agentTitle;
  return typeof n === "string" && n.trim() !== "" && typeof t === "string" && t.trim() !== "";
}

const LIFECYCLE_FORENSIC_ACTIONS = new Set([
  "ASSIGNEE_CHANGE",
  "THREAT_CONFIRMED",
  "ATTESTATION_SUBMITTED",
  "THREAT_RESOLVED",
]);

/** Single-sentence human interpretation for the audit modal (non-legal; raw JSON remains evidence). */
function getForensicNarrative(item: LogEntryItem): string {
  const e = item.entry;
  const actor = operatorIdToDisplayName(e.user_id ?? "");
  const action = (e.action_type ?? "").trim();
  const parsedJustification = safeParseJustificationRecord(e.justification);
  const ironscribeLine = ironscribeNarrativeFromJustification(e.justification);
  if (ironscribeLine) return ironscribeLine;
  const identity = resolveForensicIdentityFromJustification(parsedJustification, actor);

  if (
    parsedJustification &&
    LIFECYCLE_FORENSIC_ACTIONS.has(action) &&
    justificationSupportsLifecycleNarrative(parsedJustification)
  ) {
    const entityLabel =
      typeof parsedJustification.entityType === "string" && parsedJustification.entityType.trim()
        ? parsedJustification.entityType.trim()
        : "risk";
    switch (action) {
      case "ASSIGNEE_CHANGE":
        return `${identity} has assumed authority over this record to begin forensic remediation.`;
      case "THREAT_CONFIRMED":
        return `The threat has been verified by ${identity}. Initial blast-radius and signatures match known ${entityLabel} patterns.`;
      case "ATTESTATION_SUBMITTED":
        return `Formal attestation submitted. ${identity} has verified that the proposed resolution complies with the Ironframe Constitution.`;
      case "THREAT_RESOLVED":
        return `Final neutralization complete. ${identity} has restored the system to a Last Known Good (LKG) state and closed the incident.`;
      default:
        break;
    }
  }

  const metaUpper = (e.metadata_tag ?? "").toUpperCase();
  const desc = e.description ?? "";
  const threatRef =
    e.threatId && e.threatId !== "SYSTEM_EVENT"
      ? `Threat #${e.threatId.slice(0, 8)}`
      : extractThreatName(desc) ?? "the active threat record";

  const assignment =
    action === "ASSIGNMENT_CHANGED" ||
    action === "ASSIGNEE_CHANGE" ||
    action.includes("ASSIGN");
  if (assignment) {
    const parsed = parseAssignmentJustification(e.justification);
    if (parsed && "newAssignee" in parsed) {
      const narrator = parsed.actor?.trim() ? operatorIdToDisplayName(parsed.actor) : actor;
      const nu = parsed.newAssignee;
      if (nu == null || String(nu).trim() === "" || String(nu).toLowerCase() === "unassigned") {
        return `${narrator} cleared assignment custody on ${threatRef}.`;
      }
      const nextName = assigneeKeyToDisplayName(String(nu));
      const prevRaw = parsed.previousAssigneeId;
      const prevLabel =
        prevRaw != null && String(prevRaw).trim() !== ""
          ? assigneeKeyToDisplayName(String(prevRaw))
          : null;
      if (prevLabel && prevLabel !== "Unassigned" && prevLabel !== nextName) {
        return `${narrator} assumed authority over ${threatRef}, transitioning from ${prevLabel}.`;
      }
      return `${narrator} assigned ${threatRef} to ${nextName}.`;
    }
    if (parsed && "newAssigneeId" in parsed) {
      const narrator = actor;
      const prevId = parsed.previousAssigneeId;
      const nextId = parsed.newAssigneeId;
      const prevLabel = prevId != null ? assigneeKeyToDisplayName(String(prevId)) : null;
      if (nextId == null) {
        return `${narrator} cleared assignment custody on ${threatRef}.`;
      }
      const nextLabel = assigneeKeyToDisplayName(String(nextId));
      if (prevLabel && prevLabel !== "Unassigned" && prevLabel !== nextLabel) {
        return `${narrator} assumed authority over ${threatRef}, transitioning from ${prevLabel}.`;
      }
      return `${narrator} assigned ${threatRef} to ${nextLabel}.`;
    }
  }

  const simSignal =
    metaUpper.includes("SIMULATION") ||
    metaUpper.includes("GRCBOT") ||
    metaUpper.includes("ATTBOT") ||
    action.includes("RED_TEAM") ||
    action.includes("SIMULATION");
  if (simSignal) {
    if (metaUpper.includes("ATTBOT") || desc.toLowerCase().includes("ingress")) {
      return "ATTBOT ingress initiated; five defensive agents mobilized to the Shadow Plane.";
    }
    return `${actor} executed a resilience simulation (${displayLabelForAuditEntry(action) || action}).`;
  }

  if (action === "THREAT_ACKNOWLEDGED" || action === "THREAT_CONFIRMED") {
    const name = extractThreatName(desc);
    return name
      ? `${actor} acknowledged responsibility for ${name}${e.threatId ? ` (${threatRef})` : ""}.`
      : `${actor} acknowledged ${threatRef}.`;
  }
  if (action === "THREAT_DE_ACKNOWLEDGED" || action === "THREAT_DEACKNOWLEDGED") {
    const name = extractThreatName(desc);
    return name
      ? `${actor} withdrew acknowledgment for ${name}.`
      : `${actor} de-acknowledged ${threatRef}.`;
  }
  if (action === "LOGIN") {
    return `${actor} authenticated into the Ironframe control session.`;
  }

  if (parsedJustification?.source === "client_audit_logger") {
    const jo = parsedJustification;
    const sub = typeof jo.description === "string" ? jo.description : desc;
    const at =
      typeof jo.action_type === "string"
        ? displayLabelForAuditEntry(jo.action_type)
        : displayLabelForAuditEntry(action);
    const clip = sub.length > 160 ? `${sub.slice(0, 157)}…` : sub;
    return `${actor} logged ${at}: ${clip}`;
  }

  const label = displayLabelForAuditEntry(action) || action || "event";
  const shortDesc = desc.trim();
  if (shortDesc && shortDesc.length <= 220) {
    return `${actor} — ${label}: ${shortDesc}`;
  }
  return `${actor} recorded ${label}.`;
}

/** @deprecated Legacy grouped list builder; main feed uses `mergeUnifiedAuditLogs` + filter + sort. */
type ThreatGroup = {
  threatId: string;
  latestAction: string;
  latestAt: number;
  entries: ServerAuditLogRow[];
};

type ListItem =
  | { type: "threat_group"; group: ThreatGroup }
  | { type: "single"; id: string; _sortTime: number; entry: ReturnType<typeof formatServerLogForDisplay> & { ip_address?: string } }
  | { type: "client"; id: string; _sortTime: number; entry: Record<string, unknown> & { id: string; timestamp?: string; description: string; action_type: string; user_id: string; ip_address?: string } };

function buildListItems(
  serverAuditLogs: ServerAuditLogRow[],
  clientWithSort: Array<Record<string, unknown> & { id: string; _sortTime?: number }>
): ListItem[] {
  const withThreatId = serverAuditLogs.filter((r): r is ServerAuditLogRow & { threatId: string } => r.threatId != null);
  const withoutThreatId = serverAuditLogs.filter((r) => r.threatId == null);
  const groupByThreat = new Map<string, ServerAuditLogRow[]>();
  for (const row of withThreatId) {
    const list = groupByThreat.get(row.threatId) ?? [];
    list.push(row);
    groupByThreat.set(row.threatId, list);
  }
  const groups: ThreatGroup[] = [];
  groupByThreat.forEach((rows, threatId) => {
    const sorted = [...rows].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const latest = sorted[sorted.length - 1];
    groups.push({
      threatId,
      latestAction: latest.action,
      latestAt: new Date(latest.createdAt).getTime(),
      entries: sorted,
    });
  });
  groups.sort((a, b) => b.latestAt - a.latestAt);
  const singleServer = withoutThreatId.map((row) => ({
    type: "single" as const,
    id: row.id,
    _sortTime: new Date(row.createdAt).getTime(),
    entry: formatServerLogForDisplay(row),
  }));
  type ClientEntry = Record<string, unknown> & { id: string; timestamp?: string; description: string; action_type: string; user_id: string; ip_address?: string };
  const clientItems: ListItem[] = clientWithSort.map((entry) => ({
    type: "client",
    id: entry.id,
    _sortTime: (entry._sortTime ?? 0) as number,
    entry: entry as ClientEntry,
  }));
  const groupItems: ListItem[] = groups.map((group) => ({ type: "threat_group", group }));
  const singleItems: ListItem[] = singleServer.map((s) => ({ type: "single", id: s.id, _sortTime: s._sortTime, entry: { ...s.entry, ip_address: (s.entry as { ip_address?: string }).ip_address ?? "—" } }));
  const combined: ListItem[] = [...groupItems, ...singleItems, ...clientItems];
  combined.sort((a, b) => {
    const timeA = a.type === "threat_group" ? a.group.latestAt : a._sortTime;
    const timeB = b.type === "threat_group" ? b.group.latestAt : b._sortTime;
    return timeB - timeA;
  });
  return combined;
}

export default function AuditIntelligence({
  showRetentionBadge = false,
  logTypeFilter,
  descriptionIncludes,
  companyId,
  serverAuditLogs = [],
  onOpenThreat,
  tenantGovernanceBps = null,
}: AuditIntelligenceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<LogEntryItem | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [hashToast, setHashToast] = useState<{ message: string; tone: "ok" | "warn" } | null>(null);
  const [metadataModal, setMetadataModal] = useState<{ agentId: string; json: string } | null>(null);
  const [masterPurgeOpen, setMasterPurgeOpen] = useState(false);
  const [timeTravelPct, setTimeTravelPct] = useState(100);
  const [replayRows, setReplayRows] = useState<LogEntryItem[] | null>(null);
  const auditLogs = useAuditLoggerStore();
  const selectedIndustry = useRiskStore((s) => s.selectedIndustry);
  const isDefenseIndustry = selectedIndustry?.trim() === "Defense";
  const selectedTenantName = useRiskStore((s) => s.selectedTenantName);
  const acceptedThreatImpacts = useRiskStore((s) => s.acceptedThreatImpacts);
  const pipelineThreats = useRiskStore((s) => s.pipelineThreats);
  const dashboardLiabilities = useRiskStore((s) => s.dashboardLiabilities);
  const riskOffset = useRiskStore((s) => s.riskOffset);
  const selectedThreatIdForAudit = useRiskStore((s) => s.selectedThreatId);
  /** Claim / assign updates `activeRiskId` only — drawer uses `selectedThreatId`; audit strip prefers claimed risk. */
  const activeRiskIdForAudit = useRiskStore((s) => s.activeRiskId);
  const focusId = useMemo(
    () => (activeRiskIdForAudit ?? selectedThreatIdForAudit)?.trim() ?? "",
    [activeRiskIdForAudit, selectedThreatIdForAudit],
  );
  const threatIndexById = useRiskStore((state) => state.threatIndexById);
  const historicalThreatNames = useRiskStore((state) => state.historicalThreatNames);
  const resolveHistoricalThreatName = useRiskStore((state) => state.resolveHistoricalThreatName);
  const { expertModeEnabled, isSimulationMode } = useSystemConfigStore();
  const isDevSwitcher = process.env.NODE_ENV === "development";
  const { switchDevTenantColdBoot, activeTenantKey, activeTenantUuid } = useTenantContext();
  const tenantScopeForKills = resolveDashboardTenantUuid(activeTenantUuid);
  const agentKills = useAgentStore((s) => s.agentKills);
  const agentKillStats = useMemo(() => {
    const entries = Object.entries(agentKills) as [string, number][];
    const total = entries.reduce((sum, [, n]) => sum + n, 0);
    const top3 = [...entries].sort((a, b) => b[1] - a[1]).slice(0, 3);
    return { total, top3 };
  }, [agentKills]);

  useEffect(() => {
    useAgentStore.getState().hydrateAgentKillsFromStorage();
  }, [tenantScopeForKills]);

  const [salvoBusy, setSalvoBusy] = useState(false);
  const [postMortemOpen, setPostMortemOpen] = useState(false);
  const [postMortemLoading, setPostMortemLoading] = useState(false);
  const [postMortemSummary, setPostMortemSummary] = useState<PostMortemSummary | null>(null);

  const fireShadowSalvo = useCallback(async () => {
    setSalvoBusy(true);
    try {
      const r = await fireAdversarialSalvoServerAction();
      if (r.ok) {
        await useRiskStore.getState().refreshPipelineThreatsFromDb();
        await useRiskStore.getState().pulseThreatBoardsFromDb().catch(() => undefined);
        setHashToast({
          tone: "ok",
          message: `Salvo: ${r.injected} KIM/GRC/ATT threats injected (pipeline refresh).`,
        });
        window.setTimeout(() => setHashToast(null), 4200);
      } else {
        setHashToast({ tone: "warn", message: r.error });
        window.setTimeout(() => setHashToast(null), 5200);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setHashToast({ tone: "warn", message: msg });
      window.setTimeout(() => setHashToast(null), 5200);
    } finally {
      setSalvoBusy(false);
    }
  }, []);

  const runPostMortem = useCallback(async () => {
    setPostMortemLoading(true);
    try {
      const r = await getPostMortemSummaryAction(24);
      if (r.ok) {
        setPostMortemSummary(r.summary);
        setPostMortemOpen(true);
      } else {
        setHashToast({ tone: "warn", message: r.error });
        window.setTimeout(() => setHashToast(null), 5200);
      }
    } finally {
      setPostMortemLoading(false);
    }
  }, []);

  const driftManifestLine = useMemo(() => {
    if (!activeTenantKey) {
      return { text: "Δ ---", tone: "neutral" as const };
    }
    const activeAleCents = BigInt(
      getTotalCurrentRiskCentsString(acceptedThreatImpacts, dashboardLiabilities, riskOffset),
    );
    return formatBaselineDriftManifestParts(activeAleCents, activeTenantKey);
  }, [activeTenantKey, acceptedThreatImpacts, dashboardLiabilities, riskOffset]);

  /** Constitutional BIGINT anchor for bound tenant — pairs with DRIFT_DELTA vs same baseline (TAS §4). */
  const aleEngineManifestLine = useMemo(
    () => formatAleEngineManifestLine(activeTenantKey),
    [activeTenantKey],
  );
  const descriptionKeywords = descriptionIncludes?.map((keyword) => keyword.toLowerCase()) ?? [];
  const industryLower = selectedIndustry.toLowerCase();
  const companyKey = (companyId ?? selectedTenantName)?.toLowerCase() ?? "";

  // # DATA_PERSISTENCE_FILTER — derive industry/tenant-scoped audit view from master auditLogs without mutating store arrays
  const clientFiltered = useMemo(
    () =>
      (auditLogs ?? []).filter((entry) => {
        if (entry.log_type === "SIMULATION") return false;
        const isGrcBotSimulation =
          entry.user_id === "GRCBOT" || (entry.metadata_tag?.includes("SIMULATION|GRCBOT") ?? false);
        if (isGrcBotSimulation) return false;
        const matchesLogType = logTypeFilter ? entry.log_type === logTypeFilter : true;
        const matchesDescription =
          descriptionKeywords.length === 0 ||
          descriptionKeywords.some((keyword) => entry.description.toLowerCase().includes(keyword));
        // Industry/tenant scoping is best-effort based on description/metadata tags; entries without tags remain visible.
        const descLower = entry.description.toLowerCase();
        const tagLower = entry.metadata_tag?.toLowerCase() ?? "";
        const hasIndustryTag = !!industryLower && (descLower.includes(industryLower) || tagLower.includes(industryLower));
        const matchesIndustry = !industryLower || hasIndustryTag || !entry.metadata_tag;
        const matchesCompany =
          !companyKey ||
          tagLower.includes(companyKey) ||
          descLower.includes(companyKey);

        return matchesLogType && matchesDescription && matchesIndustry && matchesCompany;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auditLogs, logTypeFilter, industryLower, companyKey, descriptionKeywords.join("|")],
  );

  const clientWithSort = clientFiltered.map((entry) => {
    const ts = (entry as { timestamp?: string }).timestamp;
    let ms = ts ? new Date(ts).getTime() : NaN;
    if (!Number.isFinite(ms)) ms = Date.now();
    return { ...entry, _sortTime: ms };
  });

  const replayCutoffMs = useMemo(() => {
    if (timeTravelPct >= 99.5) return null;
    const spanMs = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - ((100 - timeTravelPct) / 100) * spanMs;
  }, [timeTravelPct]);

  useEffect(() => {
    if (replayCutoffMs == null) {
      setReplayRows(null);
      return;
    }
    const ac = new AbortController();
    const iso = new Date(replayCutoffMs).toISOString();
    void fetch(`/api/opsupport/simulation-audit?until=${encodeURIComponent(iso)}`, {
      credentials: "include",
      signal: ac.signal,
    })
      .then((r) => r.json())
      .then((data: { rows?: OpSupportSimAuditRow[] }) => {
        const mapped = (data.rows ?? []).map(mapSimReplayToLogItem);
        setReplayRows(mapped);
      })
      .catch(() => setReplayRows([]));
    return () => ac.abort();
  }, [replayCutoffMs]);

  const mergedLogs = useMemo(() => {
    const base = mergeUnifiedAuditLogs(serverAuditLogs ?? [], clientWithSort);
    if (replayCutoffMs == null) return base;
    const cutoff = replayCutoffMs;
    const clientSlice = base.filter((item) => new Date(item.createdAt).getTime() <= cutoff);
    const dbPart = replayRows ?? [];
    const map = new Map<string, LogEntryItem>();
    for (const x of [...dbPart, ...clientSlice]) {
      map.set(x.id, x);
    }
    return Array.from(map.values());
  }, [serverAuditLogs, clientWithSort, replayCutoffMs, replayRows]);

  const searchLower = searchTerm.trim().toLowerCase();
  /** Filter merged list first; then sort newest-first (Task 4). */
  const filteredLogs = useMemo(() => {
    if (!searchLower) return mergedLogs;
    return mergedLogs.filter((item) => auditEntryMatchesSearch(item.entry, searchLower));
  }, [mergedLogs, searchLower]);

  const logsToDisplay = useMemo((): LogEntryItem[] => {
    const sorted = sortCombinedLogsNewestFirst(filteredLogs);
    const focus = focusId;
    if (!focus) return sorted;
    const matches = (item: LogEntryItem) => {
      const e = item.entry;
      if (e.threatId === focus) return true;
      if (e.metadata_tag?.includes(focus)) return true;
      return (e.description ?? "").includes(focus.slice(0, 10));
    };
    const pri = sorted.filter(matches);
    const rest = sorted.filter((item) => !matches(item));
    return [...pri, ...rest];
  }, [filteredLogs, focusId]);

  const logScrollRef = useRef<HTMLDivElement>(null);
  const [logScrollTop, setLogScrollTop] = useState(0);
  const [logViewportH, setLogViewportH] = useState(640);

  useLayoutEffect(() => {
    const el = logScrollRef.current;
    if (!el) return;
    const sync = () => setLogViewportH(Math.max(120, el.clientHeight));
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const auditLogVirtual = useMemo(() => {
    const n = logsToDisplay.length;
    if (n === 0) {
      return { slice: [] as LogEntryItem[], startIndex: 0, totalHeight: 0 };
    }
    const start = Math.max(
      0,
      Math.floor(logScrollTop / AUDIT_LOG_ROW_EST_PX) - AUDIT_LOG_VIRTUAL_OVERSCAN,
    );
    const end = Math.min(
      n,
      Math.ceil((logScrollTop + logViewportH) / AUDIT_LOG_ROW_EST_PX) + AUDIT_LOG_VIRTUAL_OVERSCAN,
    );
    return {
      slice: logsToDisplay.slice(start, end),
      startIndex: start,
      totalHeight: n * AUDIT_LOG_ROW_EST_PX,
    };
  }, [logsToDisplay, logScrollTop, logViewportH]);

  const auditFocusId = focusId;
  const focusedThreat = auditFocusId ? threatIndexById[auditFocusId] : undefined;

  /** Same pipeline as `app/reports/audit-trail/page.tsx` — GRC forensic ledger PDF + EXPORT_PDF audit row. */
  const handleAuditPdfExport = useCallback(() => {
    const logs = getAuditLogs();
    const filter = {
      logTypeFilter,
      descriptionIncludes,
      companyId,
      selectedIndustry,
      selectedTenantName,
    };
    const filteredEntries = getFilteredAuditLogsForReport(logs, filter);
    const riskSummary = computeRiskSummary({
      selectedIndustry,
      acceptedThreatImpacts,
      pipelineThreats,
      dashboardLiabilities,
      riskOffset,
    });
    const tenantLabel = selectedTenantName?.trim() || "[ PENDING SELECTION ]";
    const pdf = buildAuditPdf({
      activeTenantName: tenantLabel,
      riskSummary,
      entries: filteredEntries,
      generatedAt: new Date().toISOString(),
    });
    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `audit-intelligence-${new Date().toISOString().slice(0, 10)}.pdf`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    appendAuditLog({
      action_type: "EXPORT_PDF",
      log_type: logTypeFilter ?? "GRC",
      description: `Forensic audit ledger export (${filteredEntries.length} entries)${
        auditFocusId ? ` | active risk ${auditFocusId.slice(0, 8)}…` : ""
      }`,
      metadata_tag: auditFocusId
        ? `AUDIT_INTEL_PDF|SHA256_LEDGER|focus:${auditFocusId.slice(0, 12)}`
        : "AUDIT_INTEL_PDF|SHA256_LEDGER",
    });
  }, [
    logTypeFilter,
    descriptionIncludes,
    companyId,
    selectedIndustry,
    selectedTenantName,
    acceptedThreatImpacts,
    pipelineThreats,
    dashboardLiabilities,
    riskOffset,
    auditFocusId,
  ]);

  const forensicReceiptSha256 =
    focusedThreat?.receiptHash?.trim() || focusedThreat?.governanceHash?.trim() || "";
  const govMultLabel =
    tenantGovernanceBps != null && tenantGovernanceBps > 0
      ? `${(tenantGovernanceBps / 100).toFixed(2)}×`
      : null;

  const vaultContextRiskId =
    (activeRiskIdForAudit?.trim() || auditFocusId.trim()) || "";

  const showVaultItarLink = Boolean(
    isDefenseIndustry && auditFocusId && ironsightVaultEvidencePresent(focusedThreat),
  );

  const jumpToThreatCard = (threatId: string) => {
    const store = useRiskStore.getState() as {
      setActiveThreat?: (id: string) => void;
      setSelectedThreatId: (id: string | null) => void;
    };
    if (store.setActiveThreat) store.setActiveThreat(threatId);
    else store.setSelectedThreatId(threatId);
    onOpenThreat?.(threatId);
  };

  useEffect(() => {
    const unresolvedIds = new Set<string>();
    for (const log of filteredLogs) {
      const id = log.entry.threatId;
      if (!id || id === "SYSTEM_EVENT") continue;
      if (threatIndexById[id]) continue;
      if (historicalThreatNames[id]) continue;
      unresolvedIds.add(id);
    }
    unresolvedIds.forEach((id) => {
      void resolveHistoricalThreatName(id);
    });
  }, [filteredLogs, threatIndexById, historicalThreatNames, resolveHistoricalThreatName]);

  useEffect(() => {
    if (!selectedEntry) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedEntry(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedEntry]);

  useEffect(() => {
    if (!metadataModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMetadataModal(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [metadataModal]);

  useEffect(() => {
    if (!hashToast) return;
    const t = window.setTimeout(() => setHashToast(null), 2000);
    return () => window.clearTimeout(t);
  }, [hashToast]);

  useEffect(() => {
    if (copyState !== "copied") return;
    const t = window.setTimeout(() => setCopyState("idle"), 2000);
    return () => window.clearTimeout(t);
  }, [copyState]);

  useEffect(() => {
    setCopyState("idle");
  }, [selectedEntry?.id]);

  useEffect(() => {
    hydrateAuditLogger();
    if (!isShadowPlaneActiveClient()) {
      purgeSimulationAuditLogs();
    }
    ensureLoginAuditEvent();

    const hasTestEntry = getAuditLogs().some(
      (entry) => entry.description === "Test Audit Entry" && entry.log_type === "GRC",
    );
    if (!hasTestEntry) {
      appendAuditLog({
        action_type: "CONFIG_CHANGE",
        log_type: "GRC",
        metadata_tag: "GRC_GOVERNANCE",
        description: "Test Audit Entry",
      });
    }

    const hasManualRiskEntry = getAuditLogs().some(
      (entry) => entry.action_type === "RISK_REGISTRATION_MANUAL" && entry.metadata_tag?.includes("industry:Finance"),
    );
    if (!hasManualRiskEntry) {
      appendAuditLog({
        action_type: "RISK_REGISTRATION_MANUAL",
        log_type: "GRC",
        user_id: "Lead Auditor",
        description: "Initial GRC process validation for enterprise scale-test.",
        metadata_tag: "industry:Finance|liability:5000000|user:Lead Auditor",
      });
      useAgentStore.getState().addStreamMessage("> [AUDIT] Manual Risk Registered: $5.0M Exposure Acknowledged.");
    }
  }, []);

  /** Derive immutable log status for display (VERIFIED = server/synced, PENDING = client-only). */
  const entryStatus = (entry: LogEntryItem["entry"]): "VERIFIED" | "PENDING" | "FLAGGED" =>
    (entry as { _fromServer?: true })._fromServer ? "VERIFIED" : "PENDING";

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col bg-slate-900/50 px-4 pt-4 pb-0 font-mono text-slate-200">
      {/* # UI_GLASS_LAYER_CONTROLS — title + search aligned; separator; Immutable / retention */}
      <div className="relative z-50 flex flex-col pt-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            AUDIT INTELLIGENCE
          </h2>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleAuditPdfExport}
              className="inline-flex items-center gap-1 rounded border border-cyan-500/45 bg-slate-950/90 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-cyan-100 shadow-[inset_0_1px_0_rgba(34,211,238,0.12)] transition-colors hover:border-cyan-400/70 hover:bg-cyan-950/50 hover:text-white"
              title="Export filtered audit ledger (PDF) — same scope as this panel"
              aria-label="Export Audit Intelligence PDF"
            >
              <Printer className="h-3 w-3 shrink-0 text-cyan-300" strokeWidth={2} aria-hidden />
              PDF
            </button>
            <button
              type="button"
              onClick={() => setMasterPurgeOpen(true)}
              className="inline-flex items-center gap-1 rounded border border-rose-500/45 bg-rose-950/80 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-rose-100 shadow-[inset_0_1px_0_rgba(244,63,94,0.12)] transition-colors hover:border-rose-400/70 hover:bg-rose-950 hover:text-white"
              title="Clear local forensic buffer only — server AuditLog rows unchanged"
              aria-label="Master Purge local ledger"
            >
              <Trash2 className="h-3 w-3 shrink-0 text-rose-300" strokeWidth={2} aria-hidden />
              Purge
            </button>
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold uppercase text-emerald-500">
              Immutable
            </span>
          </div>
        </div>
        {isSimulationMode ? (
          <div className="mb-2 animate-pulse rounded border border-amber-500/45 bg-gradient-to-r from-amber-950/90 via-cyan-950/35 to-amber-950/85 px-2 py-1.5 text-center text-[9px] font-black uppercase tracking-wide text-amber-50 shadow-[0_0_16px_rgba(34,211,238,0.18)]">
            [ ⚠️ SHADOW PLANE ACTIVE — SIMULATION MODE ]
          </div>
        ) : null}
        <input
          type="text"
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-0 min-h-[40px] w-full rounded border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-white placeholder:text-slate-500"
          aria-label="Filter audit logs"
        />
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between gap-2 text-[8px] font-mono uppercase tracking-wide text-slate-500">
            <span className="text-slate-400">Time-travel</span>
            <span
              className={
                timeTravelPct >= 99.5
                  ? "font-black text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.45)]"
                  : "font-black text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.35)]"
              }
            >
              {timeTravelPct >= 99.5
                ? "● LIVE"
                : `REPLAY: ${
                    replayCutoffMs != null ? new Date(replayCutoffMs).toLocaleString() : "…"
                  }`}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={timeTravelPct}
            onChange={(e) => setTimeTravelPct(Number(e.target.value))}
            className="h-2 w-full cursor-pointer accent-cyan-500"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={timeTravelPct}
            aria-label="Scrub audit history — right is live stream, left loads DB simulation audit snapshot"
          />
          <p className="text-[8px] text-slate-600">
            Past ← merges Prisma simulation audit (`/api/opsupport/simulation-audit?until=`) + client lines ≤ cutoff.
          </p>
        </div>
        <div className="border-b border-slate-800/50 mt-4 mb-2" aria-hidden />

        {auditFocusId ? (
          <div className="mb-3 rounded border border-emerald-700/40 bg-emerald-950/25 px-2.5 py-2 text-[9px] leading-snug text-emerald-100/95">
            <p className="font-black uppercase tracking-wide text-emerald-400/90">Forensic stream — active risk</p>
            <p className="mt-1 font-mono text-[8px] text-slate-400">UUID {auditFocusId.slice(0, 12)}…</p>
            {govMultLabel ? (
              <p className="mt-1 font-mono text-emerald-200/90">
                Tenant governance uplift (bps→×): <span className="font-bold text-white">{govMultLabel}</span>
              </p>
            ) : null}
            {forensicReceiptSha256 ? (
              <p className="mt-1 break-all font-mono text-[8px] text-slate-300">
                {focusedThreat?.receiptHash
                  ? "Disposition receipt (SHA-256): "
                  : "Tenant binding seal (SHA-256): "}
                <span className="text-emerald-300">{forensicReceiptSha256}</span>
              </p>
            ) : null}
            {showVaultItarLink && vaultContextRiskId ? (
              <Link
                href={`/vault?filter=ITAR&context=${encodeURIComponent(vaultContextRiskId)}`}
                className="mt-2 inline-flex flex-wrap items-center gap-2 rounded border border-cyan-500/35 bg-cyan-950/40 px-2 py-1.5 text-[9px] font-black uppercase tracking-wide text-cyan-100 shadow-sm shadow-cyan-950/40 transition-colors hover:border-cyan-400/60 hover:bg-cyan-900/50 hover:text-white"
                title="Defense governance uplift — ITAR-class evidence vault"
              >
                <Folder className="h-3.5 w-3.5 shrink-0 text-cyan-300" aria-hidden />
                <span className="inline-flex items-center rounded border border-emerald-600/45 bg-emerald-950/55 px-1.5 py-0.5 text-[8px] font-bold tracking-wide text-emerald-100/95">
                  {DEFENSE_REGULATORY_SHIELD_BADGE_LABEL}
                </span>
                <span className="text-cyan-50">View ITAR Evidence</span>
              </Link>
            ) : null}
            {focusedThreat?.agentReasonings && focusedThreat.agentReasonings.length > 0 ? (
              <ul className="mt-2 max-h-24 space-y-1 overflow-y-auto text-[8px] text-slate-400">
                {focusedThreat.agentReasonings.slice(0, 6).map((ar) => {
                  const copyForensicSealHash = () => {
                    const hex = forensicReceiptSha256.trim();
                    if (!hex) {
                      setHashToast({ message: "No SHA-256 receipt sealed for this risk", tone: "warn" });
                      return;
                    }
                    void navigator.clipboard?.writeText(hex).then(
                      () => setHashToast({ message: "Forensic Hash Copied", tone: "ok" }),
                      () => setHashToast({ message: "Clipboard unavailable", tone: "warn" }),
                    );
                  };
                  const openAgentReasoningModal = (e: MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    e.stopPropagation();
                    let json: string;
                    try {
                      json = JSON.stringify(
                        { agentId: ar.agentId, reasoning: ar.reasoning, metadata: ar.metadata ?? null },
                        null,
                        2,
                      );
                    } catch {
                      json = JSON.stringify({
                        agentId: ar.agentId,
                        reasoning: ar.reasoning,
                        metadata: String(ar.metadata),
                      });
                    }
                    setMetadataModal({ agentId: ar.agentId, json });
                  };
                  return (
                    <li key={ar.id} className="flex gap-1.5 border-l border-emerald-600/50 pl-2">
                      <button
                        type="button"
                        onClick={openAgentReasoningModal}
                        className="mt-0.5 shrink-0 rounded p-0.5 text-cyan-400/90 transition-colors hover:bg-emerald-950/80 hover:text-cyan-200"
                        aria-label={`Open raw reasoning JSON for ${ar.agentId}`}
                        title="Agent reasoning (JSON)"
                      >
                        <ExternalLink className="h-3 w-3" strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          copyForensicSealHash();
                        }}
                        className="min-w-0 flex-1 cursor-pointer rounded px-0.5 text-left transition-colors hover:bg-emerald-950/40 hover:text-slate-200"
                        title="Copy disposition SHA-256 receipt hash"
                      >
                        <span className="font-bold text-slate-500">{ar.agentId}</span> — {ar.reasoning.slice(0, 220)}
                        {ar.reasoning.length > 220 ? "…" : ""}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        ) : null}

        {showRetentionBadge ? (
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="rounded border border-blue-500/70 bg-blue-500/10 px-2 py-1 text-[9px] font-bold uppercase text-blue-200">
              Retention Policy: 7-Year Compliance Active
            </span>
          </div>
        ) : null}
      </div>

      {/* # Update 9: Immutable Log Feed — scroll-only region; dev strip + manifest are siblings below (no overlap). */}
      <div className="relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden">
        {logsToDisplay.length > 0 && !expertModeEnabled ? (
          <div className="mb-2 shrink-0 rounded border border-slate-700 bg-slate-800/50 px-2 py-1.5 text-center font-sans text-[11px] text-slate-400">
            Expert Mode OFF — enable in header for full telemetry
          </div>
        ) : null}
        <div
          ref={logScrollRef}
          onScroll={(e) => setLogScrollTop(e.currentTarget.scrollTop)}
          className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
        >
          {logsToDisplay.length === 0 ? (
            <div className="mt-4 rounded-md border border-dashed border-slate-800 p-4 text-center text-sm font-mono italic text-slate-500">
              {auditFocusId
                ? "Custody channel open — server audit rows will appear as Irongate commits (refresh syncs ledger)."
                : "System Nominal. Awaiting audit events..."}
            </div>
          ) : (
            <div className="relative w-full" style={{ height: Math.max(auditLogVirtual.totalHeight, 1) }}>
              {auditLogVirtual.slice.map((item, vi) => {
                const index = auditLogVirtual.startIndex + vi;
                const status = entryStatus(item.entry);
                const timeStr =
                  typeof item.entry.timestamp === "string" && item.entry.timestamp
                    ? item.entry.timestamp.includes(",")
                      ? new Date(item.entry.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: false,
                        })
                      : item.entry.timestamp
                    : "—";
                const primaryLine = auditBattlefieldPrimaryLine(item.entry);
                const ledgerSeq = (item.entry as { ledger_sequence?: number }).ledger_sequence;
                const showLedgerChip =
                  !auditPrimaryLineHasLedgerSeq(primaryLine) &&
                  typeof ledgerSeq === "number" &&
                  Number.isFinite(ledgerSeq);
                const forensicLvl = (item.entry as { forensic_event_level?: ForensicEventLevel })
                  .forensic_event_level;
                const openAuditDetail = () => setSelectedEntry(item);
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={openAuditDetail}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openAuditDetail();
                      }
                    }}
                    style={{
                      position: "absolute",
                      top: index * AUDIT_LOG_ROW_EST_PX,
                      left: 0,
                      right: 0,
                      minHeight: AUDIT_LOG_ROW_EST_PX,
                    }}
                    className={`group relative cursor-pointer border-l pl-3 pr-1 transition-colors ${auditRowForensicBorderClass(item.entry)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center justify-between gap-2">
                          <span className="text-[9px] font-bold text-slate-600">{timeStr}</span>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <span
                              className={`text-[8px] font-black uppercase tracking-tighter ${
                                status === "VERIFIED"
                                  ? "text-emerald-500"
                                  : status === "FLAGGED"
                                    ? "text-amber-500"
                                    : "text-amber-500"
                              }`}
                            >
                              {status}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEntry(item);
                              }}
                              className="rounded p-0.5 text-slate-500 opacity-0 transition-opacity hover:bg-slate-800 hover:text-sky-400 group-hover:opacity-100"
                              aria-label="Open audit detail"
                              title="Detail"
                            >
                              <Info className="h-3.5 w-3.5" strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                        <p
                          className={`line-clamp-2 break-words text-[9px] font-mono font-semibold leading-snug ${auditRowForensicClass(item.entry)}`}
                        >
                          {forensicLvl === "red_team" ? (
                            <span className="mr-0.5 inline select-none text-[9px] text-rose-400/80" aria-hidden>
                              &gt;
                            </span>
                          ) : forensicLvl === "blue_team" ? (
                            <span className="mr-0.5 inline select-none text-[9px] text-emerald-400/85" aria-hidden>
                              &gt;
                            </span>
                          ) : null}
                          {showLedgerChip ? (
                            <span className="mr-1.5 inline font-mono text-[9px] font-bold tabular-nums text-slate-500">
                              {formatLedgerSequenceLabel(ledgerSeq!)}
                            </span>
                          ) : null}
                          {primaryLine}
                        </p>
                        <p className="text-[9px] text-slate-500">Actor: {item.entry.user_id ?? "—"}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isDevSwitcher ? (
        <div
          className="relative z-40 shrink-0 border-t border-slate-800 bg-slate-950 px-2 py-2 shadow-[0_-10px_28px_rgba(0,0,0,0.5)]"
          aria-label="Development tenant switcher"
        >
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-[8px] font-bold uppercase tracking-wide text-slate-500">
              Dev tenant switcher
            </p>
            <span className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[8px] font-mono text-slate-400">
              Active: {activeTenantKey ? activeTenantKey.toUpperCase() : "NONE"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-0.5 gap-y-1 font-mono text-[8px]">
            {DEV_TENANT_CONTROL_CHIPS.map((chip, idx) => (
              <span key={chip.key} className="flex items-center gap-x-0.5">
                {idx > 0 ? <span className="select-none text-slate-600">|</span> : null}
                <button
                  type="button"
                  onClick={() => switchDevTenantColdBoot(chip.key)}
                  title={`${chip.title} — ${chip.aleDisplay} ALE (${chip.sector})`}
                  className="rounded border border-slate-600 bg-slate-950 px-1.5 py-0.5 font-bold uppercase tracking-tight text-slate-200 hover:border-slate-400 hover:bg-slate-900/90"
                >
                  [{chip.title.toUpperCase()}]
                </button>
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => switchDevTenantColdBoot(null)}
            className="mt-1.5 w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-wide text-slate-300 hover:border-slate-500"
          >
            Clear override (global)
          </button>
        </div>
      ) : null}

      <footer
        className="relative z-30 shrink-0 space-y-0.5 border-t border-slate-800 bg-slate-900 px-1 py-2 pb-3 font-mono text-[8px] leading-tight text-slate-500/80 shadow-[0_-8px_24px_rgba(15,23,42,0.85)]"
        role="contentinfo"
        aria-label="GRC version manifest"
      >
        <p className="flex flex-wrap items-center gap-x-1 gap-y-0">
          <span>VER_MANIFEST:</span>
          {isDefenseIndustry ? (
            <span
              className="inline-block size-1.5 shrink-0 rounded-full bg-emerald-500"
              title="Defense-Grade Scrutiny active"
              aria-label="Defense-Grade Scrutiny active"
            />
          ) : null}
          <span>1.0.4-GOLD</span>
        </p>
        <p>{aleEngineManifestLine}</p>
        <p
          className={
            driftManifestLine.tone === "emerald"
              ? "text-emerald-500"
              : driftManifestLine.tone === "amber"
                ? "text-amber-500"
                : "text-slate-500/90"
          }
        >
          DRIFT_DELTA: {driftManifestLine.text}
        </p>
        <p>DRIFT_SENTRY: 60s_ACTIVE</p>
        <p>HANDSHAKE_LOGIC: LG_GRID_V3</p>
        <p>PRINT_CHIP: RESTORED_V1</p>
        <p>LOG_SEQUENCE: ENABLED_L3</p>
        <p>FORENSIC_INTEGRITY: SEQUENTIAL</p>
        <p className="text-emerald-600/90">LOGIC_BRIDGE: VERIFIED_V1</p>
        <p className="text-emerald-600/90">Z_INDEX_POLICY: ENFORCED</p>
        <p
          className="cursor-help text-cyan-400/95 transition-colors hover:text-amber-300"
          title={
            agentKillStats.total === 0
              ? "Resolved-threat attribution (no kills yet)"
              : agentKillStats.top3.map(([n, c]) => `${n.toUpperCase()}: ${c}`).join(" | ")
          }
        >
          AGENT_KILLS: {agentKillStats.total}
        </p>
        <button
          type="button"
          disabled={postMortemLoading}
          onClick={() => void runPostMortem()}
          className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-left font-mono text-[8px] font-black uppercase tracking-wide text-slate-200 hover:border-cyan-500/60 hover:text-cyan-100 disabled:opacity-50"
        >
          {postMortemLoading ? "BUILDING POST-MORTEM…" : "GENERATE POST-MORTEM"}
        </button>
        {isSimulationMode ? (
          <button
            type="button"
            disabled={salvoBusy}
            onClick={() => void fireShadowSalvo()}
            className="mt-1 w-full rounded border border-amber-600/50 bg-amber-950/40 px-2 py-1 text-left font-mono text-[8px] font-black uppercase tracking-wide text-amber-100 hover:border-amber-400 disabled:opacity-50"
          >
            {salvoBusy ? "FIRING SALVO…" : "FIRE ADVERSARIAL SALVO (15–20)"}
          </button>
        ) : null}
        {isSimulationMode ? (
          <p className="animate-pulse font-black uppercase tracking-wide text-amber-400/95 shadow-[0_0_10px_rgba(251,191,36,0.35)]">
            [ ⚠️ SHADOW PLANE ACTIVE — SIMULATION MODE ]
          </p>
        ) : null}
      </footer>

      {postMortemOpen && postMortemSummary ? (
        <div
          className="fixed inset-0 z-[275] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="post-mortem-title"
        >
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-cyan-700/40 bg-slate-950 shadow-2xl shadow-cyan-950/30">
            <div className="shrink-0 border-b border-slate-800 px-4 py-3">
              <h3 id="post-mortem-title" className="text-[11px] font-black uppercase tracking-wide text-cyan-100">
                Session post-mortem
              </h3>
              <p className="mt-1 font-mono text-[8px] leading-snug text-slate-500">
                Window {postMortemSummary.windowStartIso.slice(0, 16)} → {postMortemSummary.windowEndIso.slice(0, 16)}{" "}
                · {postMortemSummary.auditRowSampled} audit rows · LKB {postMortemSummary.lookbackHours}h
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 font-mono text-[9px] leading-snug text-slate-300">
              <div>
                <p className="font-black uppercase tracking-wide text-amber-400/90">Dominant attack vector</p>
                <p className="mt-0.5 text-slate-200">
                  {postMortemSummary.dominantVector ?? "— (embed attack_vector in bot metadata / justification JSON)"}
                </p>
              </div>
              <div>
                <p className="font-black uppercase tracking-wide text-emerald-400/90">Top attack vectors</p>
                <ul className="mt-1 space-y-0.5">
                  {postMortemSummary.topAttackVectors.length === 0 ? (
                    <li className="text-slate-500">No vectors extracted yet.</li>
                  ) : (
                    postMortemSummary.topAttackVectors.map((v) => (
                      <li key={v.vector} className="flex justify-between gap-2 border-b border-slate-800/80 py-0.5">
                        <span>{v.vector}</span>
                        <span className="tabular-nums text-slate-400">{v.count}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div>
                <p className="font-black uppercase tracking-wide text-cyan-400/90">Top threats (audit linkage)</p>
                <ul className="mt-1 space-y-0.5">
                  {postMortemSummary.topThreats.length === 0 ? (
                    <li className="text-slate-500">No threat IDs in window.</li>
                  ) : (
                    postMortemSummary.topThreats.map((t) => (
                      <li key={t.threatId} className="border-b border-slate-800/80 py-0.5">
                        <span className="text-slate-400">{t.threatId.slice(0, 12)}…</span> — {t.title}{" "}
                        <span className="tabular-nums text-slate-500">({t.eventCount})</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div>
                <p className="font-black uppercase tracking-wide text-rose-300/90">Agent MVP (resolved)</p>
                <p className="mt-0.5">
                  {postMortemSummary.agentMvp ? (
                    <>
                      <span className="text-slate-100">{postMortemSummary.agentMvp.label}</span> —{" "}
                      <span className="tabular-nums">{postMortemSummary.agentMvp.resolveCount}</span> resolves
                    </>
                  ) : (
                    <span className="text-slate-500">No THREAT_RESOLVED rows in window.</span>
                  )}
                </p>
                <p className="mt-2 text-[8px] uppercase tracking-wide text-slate-600">
                  Live AGENT_KILLS (UI roster): {agentKillStats.total}
                </p>
              </div>
            </div>
            <div className="shrink-0 border-t border-slate-800 px-4 py-2">
              <button
                type="button"
                className="w-full rounded border border-slate-600 bg-slate-900 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-300 hover:border-slate-500"
                onClick={() => setPostMortemOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {masterPurgeOpen ? (
        <div
          className="fixed inset-0 z-[280] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="master-purge-title"
        >
          <div className="w-full max-w-md rounded-lg border border-rose-600/50 bg-slate-950 p-5 shadow-2xl shadow-rose-950/40">
            <h3 id="master-purge-title" className="text-center text-[11px] font-black uppercase tracking-wide text-rose-100">
              PERMANENTLY WIPE FORENSIC LEDGER?
            </h3>
            <p className="mt-3 text-center text-[10px] leading-relaxed text-slate-400">
              Clears the <span className="font-bold text-slate-300">local</span> Audit Intelligence buffer only.
              Server <span className="font-mono text-slate-300">AuditLog</span> rows are unchanged.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                className="rounded border border-slate-600 bg-slate-900 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-300 hover:border-slate-500"
                onClick={() => setMasterPurgeOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded border border-rose-500/70 bg-rose-950/90 px-4 py-2 text-[10px] font-black uppercase tracking-wide text-rose-50 hover:bg-rose-900"
                onClick={() => {
                  clearAllAuditLogs({ masterPurge: true });
                  setMasterPurgeOpen(false);
                  appendAuditLog({
                    action_type: "SYSTEM_WARNING",
                    log_type: "GRC",
                    metadata_tag: "MASTER_PURGE_LOCAL",
                    description: "Master Purge: local forensic ledger buffer cleared by operator.",
                  });
                }}
              >
                Confirm wipe
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {hashToast ? (
        <div
          role="status"
          aria-live="polite"
          className={`pointer-events-none fixed bottom-6 left-1/2 z-[230] -translate-x-1/2 rounded border px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wide shadow-lg shadow-black/40 ${
            hashToast.tone === "ok"
              ? "border-emerald-600/70 bg-emerald-950/95 text-emerald-100"
              : "border-amber-600/70 bg-amber-950/95 text-amber-100"
          }`}
        >
          {hashToast.message}
        </div>
      ) : null}

      {metadataModal ? (
        <div
          className="fixed inset-0 z-[225] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="agent-metadata-title"
          onClick={() => setMetadataModal(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
              <h3 id="agent-metadata-title" className="text-[11px] font-black uppercase tracking-wide text-slate-200">
                Reasoning trace — {metadataModal.agentId}
              </h3>
              <button
                type="button"
                onClick={() => setMetadataModal(null)}
                className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[9px] font-bold uppercase text-slate-400 hover:border-slate-500 hover:text-slate-200"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <pre className="whitespace-pre-wrap break-all font-mono text-[10px] leading-relaxed text-emerald-200/90">
                {metadataModal.json}
              </pre>
            </div>
          </div>
        </div>
      ) : null}

      {selectedEntry ? (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-detail-title"
          onClick={() => setSelectedEntry(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950/90 shadow-2xl shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 border-b border-slate-800 bg-slate-950/95 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 id="audit-detail-title" className="text-[11px] font-black uppercase tracking-wide text-slate-200">
                    {typeof (selectedEntry.entry as { ledger_sequence?: number }).ledger_sequence === "number" &&
                    Number.isFinite((selectedEntry.entry as { ledger_sequence?: number }).ledger_sequence!) ? (
                      <span className="mr-2 inline font-mono text-[11px] font-bold tabular-nums text-slate-400">
                        {formatLedgerSequenceLabel(
                          (selectedEntry.entry as { ledger_sequence?: number }).ledger_sequence!,
                        )}
                      </span>
                    ) : null}
                    {displayLabelForAuditEntry(selectedEntry.entry.action_type) ||
                      selectedEntry.entry.action_type}
                  </h3>
                  <p className="mt-1 font-mono text-[10px] leading-relaxed text-slate-500">
                    Local:{" "}
                    {selectedEntry.createdAt.toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "medium",
                    })}{" "}
                    |{" "}
                    <span className="font-bold text-slate-200">
                      UTC: {selectedEntry.createdAt.toISOString()}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEntry(null)}
                  className="shrink-0 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[9px] font-bold uppercase text-slate-400 hover:border-slate-500 hover:text-slate-200"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="shrink-0 border-b border-slate-800/80 px-4 py-3">
              <p className="mb-2 text-[8px] font-black uppercase tracking-widest text-slate-600">
                Narrative Summary
              </p>
              <p className="text-slate-200 text-sm italic border-l-2 border-emerald-500 pl-4 mb-6">
                {getForensicNarrative(selectedEntry)}
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-3">
              <p className="mb-2 text-[8px] font-black uppercase tracking-widest text-slate-600">
                RAW FORENSIC DATA
              </p>
              <div className="max-h-[450px] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700">
                <pre className="whitespace-pre-wrap break-words rounded-md border border-slate-800 bg-black/60 p-4 font-mono text-[11px] text-emerald-400/90">
                  {buildForensicEntryJson(selectedEntry)}
                </pre>
              </div>

              {selectedEntry.entry.threatId ? (
                <div className="mt-4 border-t border-slate-800 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      jumpToThreatCard(selectedEntry.entry.threatId!);
                      setSelectedEntry(null);
                    }}
                    className="w-full rounded border border-sky-600/60 bg-sky-950/40 py-2 text-[10px] font-black uppercase tracking-wide text-sky-200 hover:border-sky-500 hover:bg-sky-900/40"
                  >
                    JUMP TO THREAT CARD
                  </button>
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-800 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(buildForensicEntryJson(selectedEntry)).then(
                    () => setCopyState("copied"),
                    () => setCopyState("idle"),
                  );
                }}
                className="inline-flex items-center gap-1.5 rounded border border-slate-600 bg-slate-900/80 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wide text-slate-200 hover:border-slate-500"
              >
                <Copy className="h-3.5 w-3.5" strokeWidth={2} />
                Copy
              </button>
              <span
                aria-live="polite"
                className={`font-mono text-[10px] text-emerald-500 transition-opacity duration-300 whitespace-nowrap ${
                  copyState === "copied" ? "opacity-100" : "opacity-0"
                }`}
              >
                HASH COPIED TO CLIPBOARD
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
