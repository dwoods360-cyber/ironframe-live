"use client";

import { useEffect, useState, useCallback } from "react";
import { useRiskStore } from "@/app/store/riskStore";
import { useAgenticComputeStore } from "@/app/store/agenticComputeStore";
import { listRecentAgentComputeLogsForTenant } from "@/app/actions/agentComputeActions";
import { GRC_GOLD_AGENTIC_MONITOR_TITLE } from "@/lib/constants/grcGold";

type Row = {
  id: string;
  agentId: string;
  durationMs: number;
  tokensIn: number;
  tokensOut: number;
  operationType: string;
  createdAt: string;
};

/**
 * Resource monitor: client HUD samples plus persisted `agent_compute_log` rows (tenant-scoped server poll).
 */
export default function AgenticComputeMonitor() {
  const samples = useAgenticComputeStore((s) => s.samples);
  const tenantName = useRiskStore((s) => s.selectedTenantName);
  const [rows, setRows] = useState<Row[]>([]);
  const [pollErr, setPollErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await listRecentAgentComputeLogsForTenant(20);
    if (Array.isArray(res)) {
      setRows(res);
      setPollErr(null);
    } else {
      setPollErr(res.error);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 8000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const latest = samples[0];
  const label = tenantName?.trim() || "My Organization";
  const serverLatest = rows[0];

  return (
    <div
      className="rounded border border-slate-700/80 bg-slate-950/70 px-3 py-2 text-[10px] text-slate-300"
      title="Hybrid retrieval timing and persisted agent compute (ms / tokens) for billing and audit."
    >
      <p className="font-black uppercase tracking-wide text-cyan-400/90">{GRC_GOLD_AGENTIC_MONITOR_TITLE}</p>
      <p className="mt-1 font-mono text-[9px] text-slate-500">
        Tenant: <span className="text-slate-300">{label}</span>
      </p>
      {pollErr ? <p className="mt-1 text-[9px] text-amber-400/90">{pollErr}</p> : null}
      {serverLatest ? (
        <p className="mt-1 font-mono tabular-nums text-[11px] text-emerald-100/95">
          Ledger · Agent {serverLatest.agentId}: {serverLatest.durationMs} ms · in {serverLatest.tokensIn} tok · out{" "}
          {serverLatest.tokensOut} tok
          <span className="block truncate text-[9px] text-slate-500">{serverLatest.operationType}</span>
        </p>
      ) : (
        <p className="mt-1 text-[9px] text-slate-500">No ledger rows yet for this tenant.</p>
      )}
      {latest ? (
        <p className="mt-1 font-mono tabular-nums text-[11px] text-cyan-100/95">
          Live preview: {latest.agentLabel}: {latest.durationMs} ms
          {latest.tokensEstimate != null ? ` · ~${latest.tokensEstimate} tok` : null}
        </p>
      ) : (
        <p className="mt-1 text-[9px] text-slate-500">Awaiting Sentinel preview or hybrid scan…</p>
      )}
      {rows.length > 1 ? (
        <ul className="mt-2 max-h-24 space-y-0.5 overflow-y-auto border-t border-slate-800/80 pt-1 text-[8px] text-slate-500">
          {rows.slice(1, 8).map((r) => (
            <li key={r.id} className="flex justify-between gap-2 font-mono">
              <span className="truncate">
                a{r.agentId} · {r.operationType}
              </span>
              <span className="shrink-0 text-slate-400">
                {r.durationMs} ms · {r.tokensIn}/{r.tokensOut} tok
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
