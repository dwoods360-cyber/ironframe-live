"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

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

type Prefill = {
  company?: string;
  channel?: "EMAIL" | "SMS";
  interactionId?: string;
  to?: string;
  touch?: "TOUCH1" | "TOUCH2" | "TOUCH3";
};

type Props = Prefill & {
  compact?: boolean;
};

function parseChannel(raw: string | null | undefined): "EMAIL" | "SMS" | undefined {
  const v = (raw ?? "").trim().toUpperCase();
  if (v === "SMS" || v === "EMAIL") return v;
  return undefined;
}

function parseTouch(raw: string | null | undefined): "TOUCH1" | "TOUCH2" | "TOUCH3" | undefined {
  const v = (raw ?? "").trim().toUpperCase();
  if (v === "TOUCH1" || v === "TOUCH2" || v === "TOUCH3") return v;
  return undefined;
}

function IcpShortlistTouchLogInner({
  initialCompany = "",
  initialChannel = "EMAIL",
  initialInteractionId = "",
  initialTo = "",
  initialTouch = "TOUCH1",
  compact = false,
}: {
  initialCompany?: string;
  initialChannel?: "EMAIL" | "SMS";
  initialInteractionId?: string;
  initialTo?: string;
  initialTouch?: "TOUCH1" | "TOUCH2" | "TOUCH3";
  compact?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const fromQuery: Prefill = {
    company: (searchParams.get("company") ?? "").trim() || undefined,
    channel: parseChannel(searchParams.get("channel")),
    interactionId: (searchParams.get("interactionId") ?? "").trim() || undefined,
    to: (searchParams.get("to") ?? "").trim() || undefined,
    touch: parseTouch(searchParams.get("touch")),
  };

  const companySeed = fromQuery.company || initialCompany;
  const channelSeed = fromQuery.channel || initialChannel;
  const interactionSeed = fromQuery.interactionId || initialInteractionId;
  const toSeed = fromQuery.to || initialTo;
  const touchSeed = fromQuery.touch || initialTouch;

  const [rows, setRows] = useState<TouchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState(companySeed);
  const [channel, setChannel] = useState<"EMAIL" | "SMS">(channelSeed);
  const [interactionId, setInteractionId] = useState(interactionSeed);
  const [to, setTo] = useState(toSeed);
  const [touch, setTouch] = useState<"TOUCH1" | "TOUCH2" | "TOUCH3">(touchSeed);
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
    if (companySeed) setCompany(companySeed);
    if (channelSeed) setChannel(channelSeed);
    if (interactionSeed) setInteractionId(interactionSeed);
    if (toSeed) setTo(toSeed);
    if (touchSeed) setTouch(touchSeed);
  }, [companySeed, channelSeed, interactionSeed, toSeed, touchSeed]);

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
      setMessage(`${data.message || "Touch logged."} Opening LIVE desk…`);
      await load();
      router.push("/dashboard/operations/workflow-review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Log failed.");
    } finally {
      setBusy(false);
    }
  };

  const autofilled = Boolean(companySeed || interactionSeed);

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
            After <strong className="text-slate-100">Approve &amp; dispatch SALES</strong>, TOUCH1 is
            logged automatically and you are taken to LIVE. Use this panel for TOUCH2/3 or audit
            corrections — not a CRM account list. Channels are EMAIL / SMS only (HITL DISPATCH
            paths). Shortlist Seg / Pri / Stage live in the markdown tables above.
          </p>
          {autofilled ? (
            <p className="mt-1 font-mono text-[10px] text-emerald-400">
              Autofilled from Approvals DISPATCH
              {companySeed ? ` · ${companySeed}` : ""}
              {channelSeed ? ` · ${channelSeed}` : ""}
            </p>
          ) : null}
        </div>
        <Link
          href="/dashboard/admin/approvals?kind=SALES"
          className="text-xs text-cyan-300 hover:underline"
        >
          ← Sales Approvals
        </Link>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-[11px] text-slate-400">
          Company
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
            placeholder="e.g. BlueRadius Cyber"
            aria-required
          />
          {!company.trim() ? (
            <span className="mt-0.5 block text-[10px] text-amber-400/90">Required to enable Save</span>
          ) : null}
        </label>
        <label className="block text-[11px] text-slate-400">
          Channel (EMAIL or SMS)
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

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || !company.trim()}
          onClick={() => void logTouch()}
          className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-40"
        >
          {busy ? "Saving…" : `Save touch · Log ${touch}`}
        </button>
        <button
          type="button"
          disabled={loading || busy}
          onClick={() => void load()}
          className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900"
        >
          Refresh log
        </button>
      </div>

      {message ? <p className="text-xs text-emerald-300">{message}</p> : null}
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="min-w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 font-mono text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-2 py-2">When</th>
              <th className="px-2 py-2">Touch</th>
              <th className="px-2 py-2">Channel</th>
              <th className="px-2 py-2">Company</th>
              <th className="px-2 py-2">To</th>
              <th className="px-2 py-2">Next</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-2 py-3 text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 py-3 text-slate-500">
                  No controlled touches logged yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-800/80">
                  <td className="whitespace-nowrap px-2 py-1.5 font-mono text-[10px] text-slate-500">
                    {row.date}
                  </td>
                  <td className="px-2 py-1.5 font-mono text-amber-300">{row.touch}</td>
                  <td className="px-2 py-1.5">{row.channel}</td>
                  <td className="px-2 py-1.5 text-slate-100">{row.company}</td>
                  <td className="px-2 py-1.5 text-slate-400">{row.to ?? "—"}</td>
                  <td className="px-2 py-1.5 text-slate-400">{row.nextTouchNote}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function IcpShortlistTouchLogClient(props: Props) {
  return (
    <Suspense
      fallback={
        <section
          id="icp-touch-log"
          className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 text-xs text-slate-400"
        >
          Loading touch log…
        </section>
      }
    >
      <IcpShortlistTouchLogInner
        initialCompany={props.company}
        initialChannel={props.channel}
        initialInteractionId={props.interactionId}
        initialTo={props.to}
        initialTouch={props.touch}
        compact={props.compact}
      />
    </Suspense>
  );
}
