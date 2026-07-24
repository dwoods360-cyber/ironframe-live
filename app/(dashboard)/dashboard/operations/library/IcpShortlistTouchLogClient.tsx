"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type TouchRow = {
  id: string;
  touch: string;
  channel: string;
  company: string;
  date: string;
  interactionId: string | null;
  dealId: string | null;
  to: string | null;
  trigger: string | null;
  nextTouchNote: string;
};

type Props = {
  /** Prefill when opened from Approvals after DISPATCH. */
  initialCompany?: string;
  initialChannel?: "EMAIL" | "SMS";
  initialInteractionId?: string;
  initialTo?: string;
  compact?: boolean;
};

export default function IcpShortlistTouchLogClient({
  initialCompany = "",
  initialChannel = "EMAIL",
  initialInteractionId = "",
  initialTo = "",
  compact = false,
}: Props) {
  const [rows, setRows] = useState<TouchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState(initialCompany);
  const [channel, setChannel] = useState<"EMAIL" | "SMS">(initialChannel);
  const [interactionId, setInteractionId] = useState(initialInteractionId);
  const [to, setTo] = useState(initialTo);
  const [touch, setTouch] = useState<"TOUCH1" | "TOUCH2" | "TOUCH3">("TOUCH1");
  const [nextTouchNote, setNextTouchNote] = useState("Wait reply / Touch 2 day 4–5");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/operations-hub/icp-shortlist/touch", {
        cache: "no-store",
      });
      const data = (await response.json()) as { rows?: TouchRow[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Failed to load touch log.");
      setRows(data.rows ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load touch log.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (initialCompany) setCompany(initialCompany);
    if (initialChannel) setChannel(initialChannel);
    if (initialInteractionId) setInteractionId(initialInteractionId);
    if (initialTo) setTo(initialTo);
  }, [initialCompany, initialChannel, initialInteractionId, initialTo]);

  const logTouch = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/operations-hub/icp-shortlist/touch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          touch,
          channel,
          company,
          interactionId: interactionId || undefined,
          to: to || undefined,
          nextTouchNote,
          occurredAt: new Date().toISOString(),
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Log failed.");
      setMessage(data.message || "Touch logged.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Log failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      id="icp-touch-log"
      className={`space-y-3 rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 ${
        compact ? "" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-400">
            C3 · Controlled touch log
          </p>
          <p className="mt-1 text-xs text-slate-300">
            Logs TOUCH1–3 after EMAIL/SMS DISPATCH. Does not edit the research tables above — those
            stay git-owned.
          </p>
        </div>
        <Link
          href="/dashboard/admin/approvals?kind=SALES"
          className="rounded-lg border border-amber-700/70 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-950/50"
        >
          Sales Approvals
        </Link>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-[11px] text-slate-400">
          Company
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
            placeholder="BlueRadius Cyber"
          />
        </label>
        <label className="block text-[11px] text-slate-400">
          Channel
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as "EMAIL" | "SMS")}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
          >
            <option value="EMAIL">EMAIL</option>
            <option value="SMS">SMS</option>
          </select>
        </label>
        <label className="block text-[11px] text-slate-400">
          Stage
          <select
            value={touch}
            onChange={(e) => setTouch(e.target.value as "TOUCH1" | "TOUCH2" | "TOUCH3")}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
          >
            <option value="TOUCH1">TOUCH1</option>
            <option value="TOUCH2">TOUCH2</option>
            <option value="TOUCH3">TOUCH3</option>
          </select>
        </label>
        <label className="block text-[11px] text-slate-400">
          To (optional)
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
            placeholder="buyer@company.com"
          />
        </label>
        <label className="block text-[11px] text-slate-400 sm:col-span-2">
          Next touch note
          <input
            value={nextTouchNote}
            onChange={(e) => setNextTouchNote(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
          />
        </label>
        {!compact ? (
          <label className="block text-[11px] text-slate-400 sm:col-span-2">
            Interaction id (from DISPATCH, optional)
            <input
              value={interactionId}
              onChange={(e) => setInteractionId(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-xs text-slate-100"
              placeholder="crm interaction id"
            />
          </label>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !company.trim()}
          onClick={() => void logTouch()}
          className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-40"
        >
          {busy ? "Logging…" : `Log ${touch}`}
        </button>
        <button
          type="button"
          disabled={loading || busy}
          onClick={() => void load()}
          className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900"
        >
          Refresh
        </button>
      </div>

      {message ? (
        <p className="rounded-md border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-100">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-rose-900/50 bg-rose-950/30 px-3 py-2 text-xs text-rose-100">
          {error}
        </p>
      ) : null}

      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Live §D touch rows
        </p>
        {loading ? (
          <p className="mt-2 text-xs text-slate-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">
            No controlled touches yet. After EMAIL DISPATCH, log TOUCH1 here.
          </p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-lg border border-slate-800">
            <table className="min-w-full border-collapse text-left text-[11px]">
              <thead className="bg-slate-950 text-[10px] uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="border-b border-slate-800 px-2 py-1.5">Date</th>
                  <th className="border-b border-slate-800 px-2 py-1.5">Company</th>
                  <th className="border-b border-slate-800 px-2 py-1.5">Stage</th>
                  <th className="border-b border-slate-800 px-2 py-1.5">Channel</th>
                  <th className="border-b border-slate-800 px-2 py-1.5">Next</th>
                </tr>
              </thead>
              <tbody className="text-slate-200">
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-800/80">
                    <td className="px-2 py-1.5 font-mono text-slate-300">{row.date}</td>
                    <td className="px-2 py-1.5">{row.company}</td>
                    <td className="px-2 py-1.5 font-semibold text-amber-200">{row.touch}</td>
                    <td className="px-2 py-1.5">{row.channel}</td>
                    <td className="px-2 py-1.5 text-slate-400">{row.nextTouchNote}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
