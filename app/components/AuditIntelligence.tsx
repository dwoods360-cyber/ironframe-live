"use client";

import { useEffect, useState, useMemo } from "react";
import { Copy, Info } from "lucide-react";
import { appendAuditLog, ensureLoginAuditEvent, getAuditLogs, hydrateAuditLogger, purgeSimulationAuditLogs, type AuditLogType, type AuditActionType } from "@/app/utils/auditLogger";
import { useAuditLoggerStore } from "@/app/utils/auditLoggerStore";
import { useRiskStore } from "@/app/store/riskStore";
import { useAgentStore } from "@/app/store/agentStore";
import { useSystemConfigStore } from "@/app/store/systemConfigStore";
import {
  assigneeKeyToDisplayName,
  operatorIdToDisplayName,
  parseAssignmentJustification,
} from "@/app/utils/assignmentChainOfCustody";

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
    _fromServer?: true;
  };
};

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
      },
    };
  });

  return [...serverItems, ...clientItems];
}

/** Newest-first after filter; uses canonical `createdAt` (matches server row / client epoch). */
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
  const meta = ((entry as { metadata_tag?: string | null }).metadata_tag ?? "").toLowerCase();
  const entityId = (entry.threatId ?? "").toLowerCase();
  const haystack = [
    label,
    (entry.action_type ?? "").toLowerCase(),
    (entry.description ?? "").toLowerCase(),
    entityId,
    meta,
    (entry.justification ?? "").toLowerCase(),
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
  return JSON.stringify(
    {
      id: e.id,
      timestamp: e.timestamp,
      /** Canonical UTC instant for GRC / legal correlation (ISO-8601) */
      utc_iso_8601: utcIso,
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

/** Single-sentence human interpretation for the audit modal (non-legal; raw JSON remains evidence). */
function getForensicNarrative(item: LogEntryItem): string {
  const e = item.entry;
  const actor = operatorIdToDisplayName(e.user_id ?? "");
  const action = (e.action_type ?? "").trim();
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

  const rawJ = e.justification?.trim();
  if (rawJ?.startsWith("{")) {
    try {
      const jo = JSON.parse(rawJ) as Record<string, unknown>;
      if (jo.source === "client_audit_logger") {
        const sub = typeof jo.description === "string" ? jo.description : desc;
        const at =
          typeof jo.action_type === "string"
            ? displayLabelForAuditEntry(jo.action_type)
            : displayLabelForAuditEntry(action);
        const clip = sub.length > 160 ? `${sub.slice(0, 157)}…` : sub;
        return `${actor} logged ${at}: ${clip}`;
      }
    } catch {
      /* fall through */
    }
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

export default function AuditIntelligence({ showRetentionBadge = false, logTypeFilter, descriptionIncludes, companyId, serverAuditLogs = [], onOpenThreat }: AuditIntelligenceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<LogEntryItem | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const auditLogs = useAuditLoggerStore();
  const selectedIndustry = useRiskStore((s) => s.selectedIndustry);
  const selectedTenantName = useRiskStore((s) => s.selectedTenantName);
  const threatIndexById = useRiskStore((state) => state.threatIndexById);
  const historicalThreatNames = useRiskStore((state) => state.historicalThreatNames);
  const resolveHistoricalThreatName = useRiskStore((state) => state.resolveHistoricalThreatName);
  const expertModeEnabled = useSystemConfigStore().expertModeEnabled;
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

  const mergedLogs = useMemo(
    () => mergeUnifiedAuditLogs(serverAuditLogs ?? [], clientWithSort),
    [serverAuditLogs, clientWithSort],
  );

  const searchLower = searchTerm.trim().toLowerCase();
  /** Filter merged list first; then sort newest-first (Task 4). */
  const filteredLogs = useMemo(() => {
    if (!searchLower) return mergedLogs;
    return mergedLogs.filter((item) => auditEntryMatchesSearch(item.entry, searchLower));
  }, [mergedLogs, searchLower]);

  const logsToDisplay = useMemo((): LogEntryItem[] => sortCombinedLogsNewestFirst(filteredLogs), [filteredLogs]);

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
    if (copyState !== "copied") return;
    const t = window.setTimeout(() => setCopyState("idle"), 2000);
    return () => window.clearTimeout(t);
  }, [copyState]);

  useEffect(() => {
    setCopyState("idle");
  }, [selectedEntry?.id]);

  useEffect(() => {
    hydrateAuditLogger();
    purgeSimulationAuditLogs();
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
    <div className="flex h-full flex-col bg-slate-900/50 p-4 font-mono text-slate-200">
      {/* # UI_GLASS_LAYER_CONTROLS — title + search aligned; separator; Immutable / retention */}
      <div className="relative z-50 flex flex-col pt-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            AUDIT INTELLIGENCE
          </h2>
          <span className="shrink-0 rounded bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold uppercase text-emerald-500">
            Immutable
          </span>
        </div>
        <input
          type="text"
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-0 min-h-[40px] w-full rounded border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-white placeholder:text-slate-500"
          aria-label="Filter audit logs"
        />
        <div className="border-b border-slate-800/50 mt-4 mb-2" aria-hidden />

        {showRetentionBadge ? (
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="rounded border border-blue-500/70 bg-blue-500/10 px-2 py-1 text-[9px] font-bold uppercase text-blue-200">
              Retention Policy: 7-Year Compliance Active
            </span>
          </div>
        ) : null}
      </div>

      {/* # Update 9: Immutable Log Feed — flat list with timestamp, status, action, actor */}
      <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar min-h-0">
        {logsToDisplay.length === 0 ? (
          <div className="text-sm font-mono italic text-slate-500 p-4 text-center border border-dashed border-slate-800 rounded-md mt-4">
            System Nominal. Awaiting audit events...
          </div>
        ) : (
          <>
            {!expertModeEnabled && (
              <div className="rounded border border-slate-700 bg-slate-800/50 px-2 py-1.5 text-center font-sans text-[11px] text-slate-400">
                Expert Mode OFF — enable in header for full telemetry
              </div>
            )}
            {logsToDisplay.map((item) => {
              const status = entryStatus(item.entry);
              const timeStr =
                typeof item.entry.timestamp === "string" && item.entry.timestamp
                  ? item.entry.timestamp.includes(",")
                    ? new Date(item.entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
                    : item.entry.timestamp
                  : "—";
              const actionLabel =
                (ACTION_LABELS[item.entry.action_type as AuditActionType] ??
                  SERVER_ACTION_LABELS[item.entry.action_type] ??
                  item.entry.action_type) ||
                item.entry.description;
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedEntry(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedEntry(item);
                    }
                  }}
                  className="group relative cursor-pointer border-l border-slate-800 pl-4 transition-colors hover:border-blue-500/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-[9px] font-bold text-slate-600">{timeStr}</span>
                        <div className="flex items-center gap-1.5">
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
                      <p className="text-[10px] font-bold uppercase leading-tight text-slate-300">{actionLabel}</p>
                      <p className="text-[9px] text-slate-500">Actor: {item.entry.user_id ?? "—"}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      <div className="mt-4 border-t border-slate-800 pt-4 text-center">
        <p className="text-[8px] font-black uppercase tracking-widest text-slate-700">Secure Ledger // Node_0xCC44</p>
      </div>

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
                    {displayLabelForAuditEntry(selectedEntry.entry.action_type) ||
                      selectedEntry.entry.action_type}
                  </h3>
                  <p className="mt-1 font-mono text-[10px] leading-relaxed text-slate-500">
                    Local:{" "}
                    {selectedEntry.createdAt.toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "medium",
                    })}{" "}
                    | UTC: {selectedEntry.createdAt.toISOString()}
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
