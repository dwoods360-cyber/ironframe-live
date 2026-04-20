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

/** Stored liability cents (BigInt-safe) → USD. */
function formatUsdFromCents(centsLike: unknown): string {
  try {
    const cents =
      typeof centsLike === "bigint"
        ? centsLike
        : typeof centsLike === "number"
          ? BigInt(Math.trunc(centsLike))
          : typeof centsLike === "string" && centsLike.trim().length > 0
            ? BigInt(centsLike.trim())
            : 0n;
    const dollars = cents / 100n;
    return Number(dollars).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
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
    <section className="rounded-md border border-zinc-800/90 bg-[#050509]/95 p-3 ring-1 ring-white/[0.04]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-wide text-zinc-200">
          Operational Audit &amp; Impact Analysis
        </h2>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || isRefreshing}
          className="rounded-md border border-zinc-600 bg-zinc-900/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading || isRefreshing ? "Refreshing..." : "Refresh Logs"}
        </button>
      </div>

      <div className="mb-3 rounded-md border border-zinc-800/80 bg-[#08080c]/90 p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
          Success Rate (Pass vs Fail)
        </p>
        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="#27272a" vertical={false} />
              <XAxis dataKey="status" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#a1a1aa", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#09090b", border: "1px solid #3f3f46", color: "#e4e4e7" }}
                cursor={{ fill: "rgba(161, 161, 170, 0.08)" }}
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
        <p className="text-[10px] text-zinc-500">Loading test history...</p>
      ) : error ? (
        <p className="text-[10px] text-rose-400">Failed to load test history: {error}</p>
      ) : logs.length === 0 ? (
        <p className="text-[10px] text-zinc-500">No test data available. Run a bot test to begin audit history</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-[10px] text-zinc-200">
            <thead>
              <tr className="border-b border-zinc-800 text-left uppercase tracking-wide text-zinc-500">
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
                  <tr key={row.id} className="border-b border-zinc-800/60">
                    <td className="px-2 py-2 text-zinc-400">{new Date(row.createdAt).toLocaleString()}</td>
                    <td className="px-2 py-2 font-bold text-zinc-100">{row.botType}</td>
                    <td className="px-2 py-2">
                      <span
                        className={`rounded border px-2 py-0.5 font-bold uppercase tracking-wide ${
                          row.disposition.toUpperCase() === "PASS"
                            ? "border-emerald-500/50 bg-emerald-950/30 text-emerald-300"
                            : "border-rose-500/50 bg-rose-950/30 text-rose-300"
                        }`}
                      >
                        {row.disposition}
                      </span>
                    </td>
                    <td className="px-2 py-2 font-mono text-zinc-300">
                      {formatUsdFromCents(meta.financialRisk_cents ?? meta.mitigatedValueCents)}
                    </td>
                    <td className="px-2 py-2 text-zinc-400">{meta.tenantName ?? tenantUuidToLabel(row.tenantId)}</td>
                    <td className="px-2 py-2 text-zinc-400">{row.operator}</td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onViewAnalysis(row)}
                          className="rounded-md border border-zinc-600 bg-zinc-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-200 hover:border-zinc-500"
                        >
                          View Analysis
                        </button>
                        <button
                          type="button"
                          onClick={() => onVoidAndReopen(row)}
                          disabled={isVoidingReceiptId === row.id}
                          className="rounded-md border border-rose-500/40 bg-rose-950/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-200 hover:bg-rose-950/35 disabled:cursor-not-allowed disabled:opacity-50"
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
