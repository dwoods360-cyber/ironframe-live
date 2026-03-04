import { create } from "zustand";
import { getAuditLogs, type AuditLogRecord } from "@/app/utils/auditLogger";
import { useRiskStore } from "@/app/store/riskStore";

type ReportState = {
  totalMitigatedRiskM: number;
  slaCompliancePct: number;
  agentEfficiencyCount: number;
  recentEvents: {
    timestamp: string;
    userId: string;
    action: string;
    justification: string | null;
  }[];
  refresh: () => void;
};

const TTL_WINDOW_MS = 72 * 60 * 60 * 1000;

function matchesIndustry(entry: AuditLogRecord, industry: string): boolean {
  if (!industry) return true;
  const key = industry.toLowerCase();
  const desc = (entry.description ?? "").toLowerCase();
  const meta = (entry.metadata_tag ?? "").toLowerCase();
  return desc.includes(key) || meta.includes(key) || meta.includes(`sector:${key}`);
}

function parseThreatNameFromDescription(keyword: string, description: string): string | null {
  const idx = description.indexOf(keyword);
  if (idx === -1) return null;
  return description.slice(idx + keyword.length).trim();
}

function buildMetricsFromSources(selectedIndustry?: string): Omit<ReportState, "refresh"> {
  const logs = getAuditLogs();
  const riskState = useRiskStore.getState();

  const totalMitigatedRiskM = riskState.riskOffset;

  let grcLogs = logs.filter((entry) => entry.log_type === "GRC" || entry.log_type === "SIMULATION");
  if (selectedIndustry) {
    grcLogs = grcLogs.filter((entry) => matchesIndustry(entry, selectedIndustry));
  }

  // Agent efficiency: number of Sentinel sweeps dispatched
  const agentEfficiencyCount = grcLogs.filter((entry) => entry.action_type === "GRC_SENTINEL_SWEEP").length;

  // SLA: time from first triage click (ack/de-ack) to process
  const firstTriageByThreat = new Map<string, number>();
  const processEvents: { threatName: string; processedAt: number; record: AuditLogRecord }[] = [];

  for (const entry of grcLogs) {
    const ts = new Date(entry.timestamp).getTime();
    if (!Number.isFinite(ts)) continue;

    if (entry.action_type === "GRC_ACKNOWLEDGE_CLICK" || entry.action_type === "GRC_DEACKNOWLEDGE_CLICK") {
      const name = parseThreatNameFromDescription("threat: ", entry.description);
      if (!name) continue;
      const existing = firstTriageByThreat.get(name);
      if (existing == null || ts < existing) {
        firstTriageByThreat.set(name, ts);
      }
    } else if (entry.action_type === "GRC_PROCESS_THREAT") {
      const name = parseThreatNameFromDescription(":", entry.description);
      if (!name) continue;
      processEvents.push({ threatName: name, processedAt: ts, record: entry });
    }
  }

  let slaNumerator = 0;
  let slaDenominator = 0;

  for (const evt of processEvents) {
    const triageTs = firstTriageByThreat.get(evt.threatName);
    if (triageTs == null) {
      continue;
    }
    slaDenominator += 1;
    if (evt.processedAt - triageTs <= TTL_WINDOW_MS) {
      slaNumerator += 1;
    }
  }

  const slaCompliancePct = slaDenominator > 0 ? (slaNumerator / slaDenominator) * 100 : 100;

  const recentEvents = grcLogs.slice(0, 10).map((entry) => ({
    timestamp: entry.timestamp,
    userId: entry.user_id,
    action: entry.action_type,
    justification: entry.metadata_tag,
  }));

  return {
    totalMitigatedRiskM,
    slaCompliancePct,
    agentEfficiencyCount,
    recentEvents,
  };
}

export const useReportStore = create<ReportState>((set) => ({
  totalMitigatedRiskM: 0,
  slaCompliancePct: 100,
  agentEfficiencyCount: 0,
  recentEvents: [],
  refresh: () => {
    const selectedIndustry = useRiskStore.getState().selectedIndustry;
    const metrics = buildMetricsFromSources(selectedIndustry);
    set(metrics);
  },
}));

