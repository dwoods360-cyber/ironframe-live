"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  approvalsDraftHref,
  draftKindBadgeClass,
  draftKindCardClass,
} from "@/app/lib/approvalDraftKinds";

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
  pendingDraftId: string | null;
  pendingSubject: string | null;
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

/**
 * Touch 2 pipeline strip — same card chrome as the Sales review queue.
 * Selecting a row with a pending HITL draft opens the shared Approvals editor
 * (identical Touch 1 UX) via `approvalsDraftHref`.
 */
export default function SalesTouch2QueuePanel() {
  const router = useRouter();
  const [payload, setPayload] = useState<Touch2QueuePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("DUE");

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

  const openDraft = (row: Touch2QueueRow) => {
    if (!row.pendingDraftId) return;
    router.push(
      approvalsDraftHref(row.pendingDraftId, "SALES", "US", "GEO", "TOUCH2"),
    );
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  };

  return (
    <section
      className="mt-6 space-y-3 rounded-xl border border-amber-900/40 bg-amber-950/10 p-4 sm:p-5"
      aria-label="Touch 2 outreach queue"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-amber-300">
            Touch 2 · same Approvals desk as Touch 1
          </h2>
          <p className="mt-1 max-w-3xl font-sans text-xs text-slate-400">
            Day 4–5 after Touch 1. Cards with a pending draft open the shared review queue +
            editor (edit → Approve &amp; dispatch). HITL only — never auto-DISPATCH.
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((row) => {
            const hasDraft = Boolean(row.pendingDraftId);
            const subject =
              row.pendingSubject?.trim() ||
              row.reAnchor?.trim() ||
              row.motion?.trim() ||
              "Touch 2 follow-up";
            return (
              <button
                key={row.interactionId}
                type="button"
                disabled={!hasDraft}
                onClick={() => openDraft(row)}
                title={
                  hasDraft
                    ? "Open in Approvals editor (same as Touch 1)"
                    : "No pending Touch 2 draft yet — queue HITL draft first"
                }
                className={`block w-full touch-manipulation rounded-xl border-l-4 border p-4 text-left transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55 ${draftKindCardClass("SALES", false)}`}
              >
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <span className="truncate font-sans text-xs font-bold text-white">
                    {row.company}
                  </span>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    <span
                      className={`rounded border px-2 py-0.5 font-mono text-[9px] uppercase ${dueBadgeClass(row.dueStatus)}`}
                    >
                      {row.dueStatus === "YES"
                        ? "Due"
                        : row.dueStatus === "WAIT"
                          ? "Wait"
                          : "Done"}
                    </span>
                    <span className="rounded border border-slate-600 bg-slate-900 px-2 py-0.5 font-mono text-[9px] uppercase text-slate-300">
                      Touch 2
                    </span>
                    <span
                      className={`rounded border px-2 py-0.5 font-mono text-[9px] uppercase ${draftKindBadgeClass("SALES")}`}
                    >
                      SALES
                    </span>
                  </div>
                </div>
                <div className="mb-1 font-mono text-[9px] uppercase tracking-wide text-slate-500">
                  Sales outreach
                </div>
                <div className="mb-1 line-clamp-2 font-sans text-xs font-medium text-slate-300">
                  {subject}
                </div>
                <div className="truncate font-mono text-[10px] text-slate-500">
                  Operator: {row.buyer}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[9px] text-slate-600">
                  <span>T1 {formatCt(row.touch1SentAt)}</span>
                  <span>T2 earliest {formatCt(row.touch2EarliestAt)}</span>
                  {hasDraft ? (
                    <span className="text-cyan-400">Open editor →</span>
                  ) : (
                    <span className="text-amber-500/80">Draft not queued</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
