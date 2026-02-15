"use client";

import { useEffect } from "react";
import { appendAuditLog, ensureLoginAuditEvent, getAuditLogs, hydrateAuditLogger, type AuditLogType } from "@/app/utils/auditLogger";
import { useAuditLoggerStore } from "@/app/utils/auditLoggerStore";

type AuditIntelligenceProps = {
  showRetentionBadge?: boolean;
  logTypeFilter?: AuditLogType;
  descriptionIncludes?: string[];
};

const ACTION_LABELS = {
  LOGIN: "Login",
  CONFIG_CHANGE: "Config Change",
  EMAIL_SENT: "Email Sent",
  ALERT_DISMISSED: "Alert Dismissed",
} as const;

export default function AuditIntelligence({ showRetentionBadge = false, logTypeFilter, descriptionIncludes }: AuditIntelligenceProps) {
  const auditLogs = useAuditLoggerStore();
  const descriptionKeywords = descriptionIncludes?.map((keyword) => keyword.toLowerCase()) ?? [];
  const filteredAuditLogs = auditLogs.filter((entry) => {
    const matchesLogType = logTypeFilter ? entry.log_type === logTypeFilter : true;
    const matchesDescription =
      descriptionKeywords.length === 0 ||
      descriptionKeywords.some((keyword) => entry.description.toLowerCase().includes(keyword));

    return matchesLogType && matchesDescription;
  });

  console.log("AUDIT_INTELLIGENCE_RENDER", {
    totalLogs: auditLogs.length,
    filteredLogs: filteredAuditLogs.length,
    logTypeFilter: logTypeFilter ?? "ALL",
    descriptionIncludes: descriptionIncludes ?? [],
  });

  useEffect(() => {
    hydrateAuditLogger();
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
  }, []);

  useEffect(() => {
    console.log("AUDIT_INTELLIGENCE_HYDRATED", auditLogs);
  }, [auditLogs]);

  return (
    <div className="flex flex-col gap-4 text-slate-200">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">AUDIT INTELLIGENCE</h2>
        {showRetentionBadge ? (
          <span className="rounded border border-blue-500/70 bg-blue-500/10 px-2 py-1 text-[9px] font-bold uppercase text-blue-200">
            Retention Policy: 7-Year Compliance Active
          </span>
        ) : null}
      </div>

      <div className="rounded border border-slate-800 bg-slate-900/40 px-2 py-1 text-[10px] text-slate-300">
        Historical Entries: <span className="font-bold text-white">{filteredAuditLogs.length}</span>
      </div>

      <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
        {filteredAuditLogs.length === 0 ? (
          <div className="rounded border border-slate-800 bg-slate-950/40 px-3 py-4 text-center text-[10px] text-slate-400">
            No audit actions captured yet.
          </div>
        ) : (
          filteredAuditLogs.map((entry) => (
            <article key={entry.id} className="rounded border border-slate-800 bg-slate-950/50 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase text-white">{ACTION_LABELS[entry.action_type] ?? entry.action_type}</p>
                <p className="text-[9px] text-slate-400">{entry.timestamp}</p>
              </div>
              <p className="mt-1 text-[10px] text-slate-300">{entry.description}</p>
              <p className="mt-1 text-[9px] uppercase tracking-wide text-slate-500">
                user_id={entry.user_id} | ip_address={entry.ip_address}
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}