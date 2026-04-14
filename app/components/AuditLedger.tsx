"use client";

import { useMemo } from "react";
import type { BotAuditLogRow } from "@/app/actions/auditActions";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

type BotAuditMetadata = {
  tenantName?: string;
  financialRisk_cents?: string | number;
  mitigatedValueCents?: string | number;
};

function parseBotAuditMetadata(value: Record<string, unknown> | null): BotAuditMetadata {
  if (!value) return {};
  return value as unknown as BotAuditMetadata;
}

function tenantUuidToLabel(tenantId: string): string {
  if (tenantId === TENANT_UUIDS.medshield) return "Medshield";
  if (tenantId === TENANT_UUIDS.vaultbank) return "Vaultbank";
  if (tenantId === TENANT_UUIDS.gridcore) return "Gridcore";
  return tenantId;
}

function formatUsdFromCents(centsLike: unknown): string {
  try {
    const cents =
      typeof centsLike === "bigint"
        ? centsLike
        : typeof centsLike === "number"
          ? BigInt(centsLike)
          : typeof centsLike === "string" && centsLike.trim().length > 0
            ? BigInt(centsLike.trim())
            : 0n;
    const dollars = cents / 100n;
    return dollars.toLocaleString("en-US", { style: "currency", currency: "USD" });
  } catch {
    return "—";
  }
}

type Props = {
  logs: BotAuditLogRow[];
  loading: boolean;
  error: string | null;
  isRefreshing: boolean;
  isVoidingReceiptId?: string | null;
  onRefresh: () => void;
  onViewAnalysis: (row: BotAuditLogRow) => void;
  onVoidAndReopen: (row: BotAuditLogRow) => void;
};

export default function AuditLedger({
  logs,
  loading,
  error,
  isRefreshing,
  isVoidingReceiptId = null,
  onRefresh,
  onViewAnalysis,
  onVoidAndReopen,
}: Props) {
  const chartData = useMemo(() => {
    const passCount = logs.filter((row) => row.disposition.toUpperCase() === "PASS").length;
    const failCount = logs.filter((row) => row.disposition.toUpperCase() === "FAIL").length;
    return [
      { status: "PASS", count: passCount, fill: "#10b981" },
      { status: "FAIL", count: failCount, fill: "#f43f5e" },
    ];
  }, [logs]);

  return (
    <section className="mt-4 rounded border border-slate-700 bg-slate-950/40 p-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-wide text-slate-200">
          Operational Audit &amp; Impact Analysis
        </h2>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || isRefreshing}
          className="rounded border border-cyan-500/70 bg-cyan-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading || isRefreshing ? "Refreshing..." : "Refresh Logs"}
        </button>
      </div>

      <div className="mb-3 rounded border border-slate-800 bg-slate-900/30 p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Success Rate (Pass vs Fail)
        </p>
        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="status" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#020617", border: "1px solid #334155", color: "#e2e8f0" }}
                cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {chartData.map((entry) => (
                  <Cell key={entry.status} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {loading ? (
        <p className="text-[10px] text-slate-400">Loading test history...</p>
      ) : error ? (
        <p className="text-[10px] text-rose-400">Failed to load test history: {error}</p>
      ) : logs.length === 0 ? (
        <p className="text-[10px] text-slate-400">
          No test data available. Run a bot test to begin audit history
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-[10px] text-slate-200">
            <thead>
              <tr className="border-b border-slate-800 text-left uppercase tracking-wide text-slate-400">
                <th className="px-2 py-2">Timestamp</th>
                <th className="px-2 py-2">Bot</th>
                <th className="px-2 py-2">Disposition</th>
                <th className="px-2 py-2">Risk Amount</th>
                <th className="px-2 py-2">Tenant</th>
                <th className="px-2 py-2">Operator</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((row) => {
                const meta = parseBotAuditMetadata(row.metadata);
                return (
                  <tr key={row.id} className="border-b border-slate-800/60">
                    <td className="px-2 py-2 text-slate-300">{new Date(row.createdAt).toLocaleString()}</td>
                    <td className="px-2 py-2 font-bold text-slate-100">{row.botType}</td>
                    <td className="px-2 py-2">
                      <span
                        className={`rounded border px-2 py-0.5 font-bold uppercase tracking-wide ${
                          row.disposition.toUpperCase() === "PASS"
                            ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                            : "border-rose-500/60 bg-rose-500/15 text-rose-300"
                        }`}
                      >
                        {row.disposition}
                      </span>
                    </td>
                    <td className="px-2 py-2 font-mono text-slate-300">
                      {formatUsdFromCents(meta.financialRisk_cents ?? meta.mitigatedValueCents)}
                    </td>
                    <td className="px-2 py-2 text-slate-300">{meta.tenantName ?? tenantUuidToLabel(row.tenantId)}</td>
                    <td className="px-2 py-2 text-slate-300">{row.operator}</td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onViewAnalysis(row)}
                          className="rounded border border-cyan-500/70 bg-cyan-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-200"
                        >
                          View Analysis
                        </button>
                        <button
                          type="button"
                          onClick={() => onVoidAndReopen(row)}
                          disabled={isVoidingReceiptId === row.id}
                          className="rounded border border-rose-500/70 bg-rose-950/25 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-200 hover:bg-rose-950/45 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isVoidingReceiptId === row.id ? "Voiding..." : "Void & Reopen"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
