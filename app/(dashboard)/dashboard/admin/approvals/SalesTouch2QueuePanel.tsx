"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { icpTouchLogHref } from "@/app/lib/approvalDraftKinds";

type Touch2DueStatus = "YES" | "WAIT" | "DONE";

type Touch2QueueRow = {
  rank: number;
  interactionId: string;
  contactId: string;
  buyer: string;
  company: string;
  email: string;
  touch1SentAt: string;
  touch2EarliestAt: string;
  dueStatus: Touch2DueStatus;
  dispatchCount: number;
  reAnchor: string | null;
  motion: string | null;
};

type Touch2QueuePayload = {
  generatedAt: string;
  dueCount: number;
  waitCount: number;
  doneCount: number;
  rows: Touch2QueueRow[];
};

function formatCt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function dueBadgeClass(status: Touch2DueStatus): string {
  if (status === "YES") return "border-emerald-700/60 bg-emerald-950/50 text-emerald-300";
  if (status === "DONE") return "border-slate-600 bg-slate-900 text-slate-400";
  return "border-amber-800/50 bg-amber-950/40 text-amber-200";
}

type FilterMode = "DUE" | "ALL" | "WAIT";

export default function SalesTouch2QueuePanel() {
  const [payload, setPayload] = useState<Touch2QueuePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("DUE");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/approvals/touch2", { cache: "no-store" });
      const data = (await res.json()) as Touch2QueuePayload & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load Touch 2 queue.");
      setPayload(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Touch 2 queue load failure.");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const rows = payload?.rows ?? [];
    if (filter === "DUE") return rows.filter((r) => r.dueStatus === "YES");
    if (filter === "WAIT") return rows.filter((r) => r.dueStatus === "WAIT");
    return rows;
  }, [payload, filter]);

  const copyReAnchor = async (row: Touch2QueueRow) => {
    if (!row.reAnchor) return;
    try {
      await navigator.clipboard.writeText(row.reAnchor);
      setCopiedId(row.interactionId);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <section
      className="mt-6 space-y-3 rounded-xl border border-amber-900/40 bg-amber-950/10 p-4 sm:p-5"
      aria-label="Touch 2 outreach queue"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-amber-300">
            Touch 2 queue · sorted by Touch 1 date sent
          </h2>
          <p className="mt-1 max-w-3xl font-sans text-xs text-slate-400">
            Day 4–5 after Touch 1. Target-specific re-anchor required before scarcity. HITL only —
            draft in Approvals, never auto-DISPATCH.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-amber-800/60 bg-amber-950/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-amber-100 hover:bg-amber-900/40 disabled:opacity-40"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {payload ? (
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wide text-slate-400">
          <span className="rounded border border-emerald-800/50 bg-emerald-950/40 px-2 py-1 text-emerald-300">
            Due {payload.dueCount}
          </span>
          <span className="rounded border border-amber-800/40 bg-amber-950/30 px-2 py-1 text-amber-200">
            Wait {payload.waitCount}
          </span>
          <span className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-400">
            Done {payload.doneCount}
          </span>
          <span className="text-slate-500">Total {payload.rows.length}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Touch 2 filter">
        {(
          [
            ["DUE", "Due now"],
            ["WAIT", "Waiting"],
            ["ALL", "All"],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            aria-pressed={filter === mode}
            onClick={() => setFilter(mode)}
            className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
              filter === mode
                ? "bg-amber-900/60 text-amber-50 ring-1 ring-amber-500/50"
                : "text-slate-400 hover:bg-slate-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      ) : null}

      {loading && !payload ? (
        <div className="rounded-lg border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
          Loading Touch 2 queue from CRM…
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
          No Touch 2 rows in this filter.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800/80">
          <table className="min-w-full border-collapse text-left text-xs">
            <thead className="bg-slate-950/80 font-mono text-[9px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Due</th>
                <th className="px-3 py-2 font-medium">Buyer / Entity</th>
                <th className="px-3 py-2 font-medium">Touch 1 sent (CT)</th>
                <th className="px-3 py-2 font-medium">T2 earliest (CT)</th>
                <th className="px-3 py-2 font-medium">Re-anchor</th>
                <th className="px-3 py-2 font-medium">Log</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={row.interactionId}
                  className="border-t border-slate-900/80 align-top hover:bg-slate-950/40"
                >
                  <td className="px-3 py-2 font-mono text-slate-500">{row.rank}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded border px-2 py-0.5 font-mono text-[9px] uppercase ${dueBadgeClass(row.dueStatus)}`}
                    >
                      {row.dueStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-sans font-semibold text-slate-100">{row.buyer}</div>
                    <div className="text-slate-300">{row.company}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-slate-500">{row.email}</div>
                    {row.motion ? (
                      <div className="mt-1 max-w-xs text-[11px] leading-snug text-slate-400">
                        {row.motion}
                      </div>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-300">
                    {formatCt(row.touch1SentAt)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-300">
                    {formatCt(row.touch2EarliestAt)}
                  </td>
                  <td className="max-w-md px-3 py-2">
                    {row.reAnchor ? (
                      <div className="space-y-1.5">
                        <p className="font-sans text-[11px] leading-relaxed text-slate-300">
                          {row.reAnchor}
                        </p>
                        <button
                          type="button"
                          onClick={() => void copyReAnchor(row)}
                          className="rounded border border-slate-700 px-2 py-0.5 font-mono text-[9px] uppercase text-slate-400 hover:border-cyan-700 hover:text-cyan-300"
                        >
                          {copiedId === row.interactionId ? "Copied" : "Copy re-anchor"}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-600">Investigate before draft</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <a
                      href={icpTouchLogHref({
                        company: row.company,
                        channel: "EMAIL",
                        interactionId: row.interactionId,
                        to: row.email || undefined,
                        touch: "TOUCH2",
                      })}
                      className="font-mono text-[10px] uppercase text-cyan-400 hover:underline"
                    >
                      TOUCH2 log
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
