"use client";

import { useEffect, useState, useMemo } from "react";
import { appendAuditLog, ensureLoginAuditEvent, getAuditLogs, hydrateAuditLogger, purgeSimulationAuditLogs, type AuditLogType, type AuditActionType } from "@/app/utils/auditLogger";
import { useAuditLoggerStore } from "@/app/utils/auditLoggerStore";
import { useRiskStore, type PipelineThreat } from "@/app/store/riskStore";
import { useAgentStore } from "@/app/store/agentStore";
import { useSystemConfigStore } from "@/app/store/systemConfigStore";
import { fetchLiveAuditTelemetry, type LiveAuditTelemetryRow } from "@/app/actions/telemetryActions";

// # AUDIT_STREAM_LOGIC (Real-time log mapping) — buildListItems, clientFiltered, listItems, filteredAuditLogs, hasAnyLogs

/** Server-fetched audit log row (from prisma.auditLog). Pass from page so router.refresh() brings new entries. */
export type ServerAuditLogRow = {
  id: string;
  action: string;
  operatorId: string;
  createdAt: Date;
  threatId: string | null;
};

export type ServerBotAuditLogRow = {
  id: string;
  botType: string;
  disposition: string;
  operator: string;
  createdAt: Date;
  metadata: Record<string, unknown> | null;
};

type AuditIntelligenceProps = {
  showRetentionBadge?: boolean;
  logTypeFilter?: AuditLogType;
  descriptionIncludes?: string[];
  /** When set, only show entries for this company (metadata_tag or description contains companyId). */
  companyId?: string | null;
  /** DB audit logs from the server. When provided, merged with client logs so sidebar updates after router.refresh(). */
  serverAuditLogs?: ServerAuditLogRow[];
  /** DB bot forensic receipts from server (BotAuditLog), used for live telemetry parity with center console. */
  serverBotAuditLogs?: ServerBotAuditLogRow[];
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
  BOT_AUDIT_RECEIPT: "Bot Audit Receipt",
};

const WORKFORCE_AGENTS = [
  "IRONCORE",
  "IRONWAVE",
  "IRONTRUST",
  "IRONSIGHT",
  "IRONSCRIBE",
  "IRONLOCK",
  "IRONCAST",
  "IRONINTEL",
  "IRONLOGIC",
  "IRONMAP",
  "IRONTECH",
  "IRONGUARD",
  "IRONWATCH",
  "IRONGATE",
  "IRONQUERY",
  "IRONSCOUT",
  "IRONBLOOM",
  "IRONETHIC",
  "IRONTALLY",
] as const;

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

function formatMillionsFromCentsBigInt(centsLike: unknown): string {
  let cents = 0n;
  try {
    if (typeof centsLike === "string" && centsLike.trim().length > 0) {
      cents = BigInt(centsLike.trim());
    } else if (typeof centsLike === "number" && Number.isFinite(centsLike)) {
      cents = BigInt(Math.trunc(centsLike));
    }
  } catch {
    cents = 0n;
  }
  const sign = cents < 0n ? "-" : "";
  const abs = cents < 0n ? -cents : cents;
  const dollars = Number(abs) / 100;
  return `${sign}$${(dollars / 1_000_000).toFixed(2)}M`;
}

function formatBotAuditLogForDisplay(
  row: ServerBotAuditLogRow,
): { id: string; timestamp: string; user_id: string; action_type: string; description: string; _sortTime: number; _fromServer: true; threatId?: string | null; ip_address?: string } {
  const metadata = row.metadata ?? {};
  const threatId =
    typeof metadata.threatId === "string" && metadata.threatId.trim().length > 0
      ? metadata.threatId.trim()
      : null;
  const threatTitle =
    typeof metadata.threatTitle === "string" && metadata.threatTitle.trim().length > 0
      ? metadata.threatTitle.trim()
      : typeof metadata.sourceAgent === "string" && metadata.sourceAgent.trim().length > 0
        ? metadata.sourceAgent.trim()
        : "Threat";
  const attestation =
    typeof metadata.agentAttestation === "string" && metadata.agentAttestation.trim().length > 0
      ? metadata.agentAttestation.trim()
      : "System Verified";
  const impact = formatMillionsFromCentsBigInt(metadata.mitigatedValueCents);
  const mapOperator = (operatorRaw: string): string => {
    const normalized = operatorRaw.trim().toUpperCase();
    if (normalized === "SYSTEM_IRONTECH_AUTO") return "Irontech (autonomous)";
    const matched = WORKFORCE_AGENTS.find((agent) => normalized.includes(agent));
    if (matched) return matched[0] + matched.slice(1).toLowerCase();
    return operatorRaw;
  };
  const mappedOperator = mapOperator(row.operator);
  const label = `[BOT_AUDIT_RECEIPT] ${row.botType} ${row.disposition} · ${impact} · ${attestation} · ${threatTitle}`;
  return {
    id: row.id,
    timestamp: typeof row.createdAt === "string" ? row.createdAt : new Date(row.createdAt).toLocaleString(),
    user_id: mappedOperator,
    action_type: "BOT_AUDIT_RECEIPT",
    description: label,
    _sortTime: new Date(row.createdAt).getTime(),
    _fromServer: true,
    threatId,
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
  serverBotAuditLogs: ServerBotAuditLogRow[],
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

  const botAuditItems: LogEntryItem[] = serverBotAuditLogs.map((row) => {
    const formatted = formatBotAuditLogForDisplay(row);
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

  const combined = [...serverItems, ...botAuditItems, ...clientItems];
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

export default function AuditIntelligence({ showRetentionBadge = false, logTypeFilter, descriptionIncludes, companyId, serverAuditLogs = [], serverBotAuditLogs = [], onOpenThreat }: AuditIntelligenceProps) {
  const [liveLogs, setLiveLogs] = useState<ServerBotAuditLogRow[]>(serverBotAuditLogs);

  useEffect(() => {
    setLiveLogs(serverBotAuditLogs);
  }, [serverBotAuditLogs]);

  useEffect(() => {
    let isMounted = true;
    const poll = () => {
      void fetchLiveAuditTelemetry()
        .then((freshRows: LiveAuditTelemetryRow[]) => {
          if (!isMounted) return;
          const normalized: ServerBotAuditLogRow[] = freshRows.map((row) => ({
            ...row,
            disposition: "PASS",
            createdAt: new Date(row.createdAt),
          }));
          const currentFirst = liveLogs[0]?.id ?? null;
          const freshFirst = normalized[0]?.id ?? null;
          if (freshFirst !== currentFirst) {
            setLiveLogs(normalized);
          }
        })
        .catch(() => {
          // Keep last known good stream when polling fails.
        });
    };
    const id = window.setInterval(poll, 3000);
    return () => {
      isMounted = false;
      window.clearInterval(id);
    };
  }, [liveLogs]);

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
    () => buildUnifiedLog(serverAuditLogs ?? [], liveLogs ?? [], clientWithSort),
    [serverAuditLogs, liveLogs, clientWithSort]
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

  /** Derive immutable log status for display (VERIFIED = server/synced, PENDING = client-only). */
  const entryStatus = (entry: LogEntryItem["entry"]): "VERIFIED" | "PENDING" | "FLAGGED" =>
    (entry as { _fromServer?: true })._fromServer ? "VERIFIED" : "PENDING";

  return (
    <div className="flex h-full flex-col bg-slate-900/50 p-4 font-mono text-slate-200">
      {/* # UI_GLASS_LAYER_CONTROLS — header + Immutable badge + Historical Entries + Search */}
      <div className="relative z-50 mb-6 flex flex-col gap-2 border-b border-slate-800 pb-4 pt-3">
        {/* PANEL HEADER — Update 9: Immutable badge */}
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Audit Intelligence
          </h2>
          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold uppercase text-emerald-500">
            Immutable
          </span>
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

      {/* # Update 9: Immutable Log Feed — flat list with timestamp, status, action, actor */}
      <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar min-h-0">
        {logsToDisplay.length === 0 ? (
          <div className="text-sm font-mono italic text-slate-500 p-4 text-center border border-dashed border-slate-800 rounded-md mt-4">
            System quiet. No terminal receipts in the telemetry stream.
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
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    const tid = item.entry.threatId;
                    if (tid) {
                      const store = useRiskStore.getState() as {
                        setActiveThreat?: (id: string) => void;
                        setSelectedThreatId: (id: string | null) => void;
                      };
                      if (store.setActiveThreat) store.setActiveThreat(tid);
                      else store.setSelectedThreatId(tid);
                      onOpenThreat?.(tid);
                    }
                  }}
                  className="group relative border-l border-slate-800 pl-4 transition-colors hover:border-blue-500/50"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-600">{timeStr}</span>
                    <span
                      className={`text-[8px] font-black uppercase tracking-tighter ${
                        status === "VERIFIED" ? "text-emerald-500" : status === "FLAGGED" ? "text-amber-500" : "text-amber-500"
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold uppercase leading-tight text-slate-300">
                    {(ACTION_LABELS[item.entry.action_type as AuditActionType] ?? SERVER_ACTION_LABELS[item.entry.action_type] ?? item.entry.action_type) || item.entry.description}
                  </p>
                  <p className="text-[9px] text-slate-500">Actor: {item.entry.user_id ?? "—"}</p>
                </div>
              );
            })}
          </>
        )}
      </div>

      <div className="mt-4 border-t border-slate-800 pt-4 text-center">
        <p className="text-[8px] font-black uppercase tracking-widest text-slate-700">Secure Ledger // Node_0xCC44</p>
      </div>
    </div>
  );
}
