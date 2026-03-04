"use client";

import { useEffect, useState, useMemo } from "react";
import { appendAuditLog, ensureLoginAuditEvent, getAuditLogs, hydrateAuditLogger, purgeSimulationAuditLogs, type AuditLogType, type AuditActionType } from "@/app/utils/auditLogger";
import { useAuditLoggerStore } from "@/app/utils/auditLoggerStore";
import { useRiskStore, type PipelineThreat } from "@/app/store/riskStore";
import { useAgentStore } from "@/app/store/agentStore";
import { useSystemConfigStore } from "@/app/store/systemConfigStore";

// # AUDIT_STREAM_LOGIC (Real-time log mapping) — buildListItems, clientFiltered, listItems, filteredAuditLogs, hasAnyLogs

/** Server-fetched audit log row (from prisma.auditLog). Pass from page so router.refresh() brings new entries. */
export type ServerAuditLogRow = {
  id: string;
  action: string;
  operatorId: string;
  createdAt: Date;
  threatId: string | null;
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

const EMPTY_THREATS_ARRAY: Array<{ id: string; title?: string; name?: string }> = [];

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
  entry: {
    id: string;
    timestamp: string;
    user_id: string;
    action_type: string;
    description: string;
    ip_address?: string;
    threatId?: string | null;
    _fromServer?: true;
  };
};

/** Build one unified log: all server rows + all client rows, flattened into a single list sorted by time (newest first). */
function buildUnifiedLog(
  serverAuditLogs: ServerAuditLogRow[],
  clientWithSort: Array<Record<string, unknown> & { id: string; timestamp?: string; description: string; action_type: string; user_id: string; ip_address?: string; _sortTime?: number }>
): LogEntryItem[] {
  const serverItems: LogEntryItem[] = serverAuditLogs.map((row) => {
    const formatted = formatServerLogForDisplay(row);
    return {
      id: row.id,
      _sortTime: formatted._sortTime,
      entry: {
        id: formatted.id,
        timestamp: formatted.timestamp,
        user_id: formatted.user_id,
        action_type: formatted.action_type,
        description: formatted.description,
        ip_address: formatted.ip_address ?? "—",
        threatId: formatted.threatId,
        _fromServer: true,
      },
    };
  });

  const clientItems: LogEntryItem[] = clientWithSort.map((entry) => ({
    id: entry.id,
    _sortTime: (entry._sortTime ?? 0) as number,
    entry: {
      id: entry.id,
      timestamp: (entry.timestamp as string) ?? "—",
      user_id: (entry.user_id as string) ?? "—",
      action_type: (entry.action_type as string) ?? "—",
      description: (entry.description as string) ?? "",
      ip_address: (entry.ip_address as string) ?? "—",
      threatId:
        extractThreatId((entry as { metadata_tag?: string | null }).metadata_tag) ??
        extractThreatId((entry.description as string) ?? ""),
    },
  }));

  const combined = [...serverItems, ...clientItems];
  combined.sort((a, b) => b._sortTime - a._sortTime);
  return combined;
}

/** @deprecated Use buildUnifiedLog for single log file; kept for type compatibility during migration. */
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
  const auditLogs = useAuditLoggerStore();
  const selectedIndustry = useRiskStore((s) => s.selectedIndustry);
  const selectedTenantName = useRiskStore((s) => s.selectedTenantName);
  const activeThreats = useRiskStore((state) => state.activeThreats);
  const pipelineThreats = useRiskStore((state) => state.pipelineThreats);
  const threatIndexById = useRiskStore((state) => state.threatIndexById);
  const historicalThreatNames = useRiskStore((state) => state.historicalThreatNames);
  const resolveHistoricalThreatName = useRiskStore((state) => state.resolveHistoricalThreatName);
  const masterThreatsRaw = useRiskStore(
    (state) =>
      ((state as unknown as { threats?: Array<{ id: string; title?: string; name?: string }> }).threats ?? EMPTY_THREATS_ARRAY),
  );
  const masterThreats = useMemo(
    () => [...activeThreats, ...pipelineThreats, ...masterThreatsRaw] as Array<PipelineThreat & { title?: string }>,
    [activeThreats, pipelineThreats, masterThreatsRaw],
  );
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

  const clientWithSort = clientFiltered.map((entry) => ({
    ...entry,
    _sortTime: (entry as { timestamp?: string } & typeof entry).timestamp ? new Date((entry as { timestamp: string }).timestamp).getTime() || 0 : 0,
  }));

  const listItems = useMemo(
    () => buildUnifiedLog(serverAuditLogs ?? [], clientWithSort),
    [serverAuditLogs, clientWithSort]
  );

  const searchLower = searchTerm.trim().toLowerCase();
  const filteredLogs = useMemo(() => {
    if (!searchLower) return listItems;
    return listItems.filter((item) => {
      const e = item.entry;
      return (
        (e.description?.toLowerCase().includes(searchLower) ?? false) ||
        (e.action_type?.toLowerCase().includes(searchLower) ?? false) ||
        (e.threatId?.toLowerCase().includes(searchLower) ?? false)
      );
    });
  }, [listItems, searchLower]);
  const logsToDisplay = filteredLogs ?? [];
  const groupedThreatLogs = useMemo(() => {
    const groups = new Map<string, {
      threatId: string;
      threatName: string | null;
      latestTime: number;
      latestAction: string;
      latestDesc: string;
      entries: typeof filteredLogs;
    }>();
    filteredLogs.forEach((log) => {
      const key = log.entry.threatId || "SYSTEM_EVENT";
      if (!groups.has(key)) {
        let threatName: string | null = null;
        if (key === "SYSTEM_EVENT") {
          threatName = "System Activity";
        } else {
          const matchedThreat = threatIndexById[key] ?? masterThreats.find((t) => t.id === key);
          threatName = matchedThreat
            ? (matchedThreat.name || null)
            : historicalThreatNames[key] ?? extractThreatName(log.entry.description);
        }
        groups.set(key, {
          threatId: key,
          threatName,
          latestTime: log._sortTime,
          latestAction: log.entry.action_type,
          latestDesc: log.entry.description,
          entries: [],
        });
      }
      const group = groups.get(key)!;
      group.entries.push(log);
      if (log._sortTime > group.latestTime) {
        group.latestTime = log._sortTime;
        group.latestAction = log.entry.action_type;
        group.latestDesc = log.entry.description;
      }
    });
    return Array.from(groups.values()).sort((a, b) => b.latestTime - a.latestTime);
  }, [filteredLogs, masterThreats, threatIndexById, historicalThreatNames]);
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
  const totalEntryCount = listItems.length;

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

  return (
    <div className="h-full flex flex-col gap-4 text-slate-200 font-sans">
      {/* # UI_GLASS_LAYER_CONTROLS — header + Historical Entries + Search (z-50 on glass) */}
      <div className="relative z-50 flex flex-col gap-2 pt-3">
        {/* PANEL HEADER */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800/50">
          <h2
            className="text-sm font-bold tracking-widest text-slate-300 uppercase"
            style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'" }}
          >
            Audit Intelligence
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span
              className="text-[10.5px] font-bold tracking-wide text-slate-300"
              style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'" }}
            >
              Live Feed
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          {showRetentionBadge ? (
            <span className="rounded border border-blue-500/70 bg-blue-500/10 px-2 py-1 text-[9px] font-bold uppercase text-blue-200">
              Retention Policy: 7-Year Compliance Active
            </span>
          ) : null}
        </div>

        <div className="rounded border border-slate-800 bg-slate-900/40 px-2 py-1 text-[10px] text-slate-300">
          Historical Entries: <span className="font-bold text-white">{totalEntryCount}</span>
        </div>

        {/* # SEARCH_ENGINE_INPUTS — Sidebar Search; relative z-50, text-slate-900 for visibility on glass */}
        <input
          type="text"
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white mb-4"
          aria-label="Filter audit logs"
        />
      </div>

      {/* # AUDIT_STREAM_LOGIC — single unified log rendered as grouped case cards */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-4 pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent space-y-2">
        {logsToDisplay.length === 0 ? (
          <div className="text-sm text-slate-500 font-mono italic p-4 text-center border border-dashed border-slate-800 rounded-md mt-4">
            System Nominal. Awaiting audit events...
          </div>
        ) : (
          <>
            {!expertModeEnabled && (
              <div className="rounded border border-slate-700 bg-slate-800/50 px-2 py-1.5 text-center font-sans text-[11px] text-slate-400">
                Expert Mode OFF — enable in header for full telemetry
              </div>
            )}
            {/* # AUDIT_ROLLUP_CARDS */}
            {groupedThreatLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center border border-dashed border-slate-800/60 rounded-lg bg-slate-900/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm text-slate-500 font-mono tracking-wider uppercase">Ledger Empty</span>
                <span className="text-[10px] text-slate-600 mt-1">Awaiting system or threat activity</span>
              </div>
            ) : (
              groupedThreatLogs.map((group) => (
                <div
                  key={group.threatId}
                  onClick={() => {
                    if (group.threatId !== "SYSTEM_EVENT") {
                      const store = useRiskStore.getState() as {
                        setActiveThreat?: (id: string) => void;
                        setSelectedThreatId: (id: string | null) => void;
                      };
                      if (store.setActiveThreat) {
                        store.setActiveThreat(group.threatId);
                      } else {
                        store.setSelectedThreatId(group.threatId);
                      }
                      onOpenThreat?.(group.threatId);
                    }
                  }}
                  className="mb-3 p-3 bg-slate-900/40 border border-slate-700/50 rounded-md cursor-pointer hover:bg-slate-800/60 transition-colors group relative"
                >
                  {/* LINE 1: Threat Name & Badge */}
                  <div className="flex justify-between items-start mb-0.5">
                    <span className="text-sm font-bold text-slate-200 group-hover:text-blue-400 truncate pr-2" title={group.threatName || "Unknown Threat"}>
                      {group.threatId === "SYSTEM_EVENT" ? "System Activity" : (group.threatName || "Unknown Threat Title")}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full flex-shrink-0">
                      {group.entries.length} {group.entries.length === 1 ? "Entry" : "Entries"}
                    </span>
                  </div>
                  {/* LINE 2: System ID */}
                  {group.threatId !== "SYSTEM_EVENT" && (
                    <div className="mb-1 text-[10px] font-mono text-slate-500 truncate" title={group.threatId}>
                      {group.threatId}
                    </div>
                  )}

                  {/* LINE 3: The Log State, Time, & Text */}
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span className="font-semibold text-amber-500/80">{group.latestAction}</span>
                    <span>{new Date(group.latestTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>

                  <div className="text-xs text-slate-400 line-clamp-2">
                    {group.latestDesc}
                  </div>
                </div>
              ))
            )}
            </>
        )}
      </div>
    </div>
  );
}
