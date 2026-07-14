"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { fetchOpsPortalJson } from "@/app/utils/fetchOpsPortalJson";

type RedactedSupportIntakeSnapshot = {
  generatedAt: string;
  crmScope: string;
  worker: { reachable: boolean; status: string | null };
  approvalQueueDepth: number;
  intakes: Array<{
    interactionId: string;
    company: string;
    fullName: string;
    email: string;
    urgency: string;
    objective: string;
    userNotes: string;
    frameworkContext: string | null;
    path: string | null;
    surface: string | null;
    incomingQuery: string;
    telemetryExcerpt: string | null;
    occurredAt: string;
  }>;
  polledAt: string;
};

export default function SupportIntakePortalClient() {
  const [snapshot, setSnapshot] = useState<RedactedSupportIntakeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollBusy, setPollBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOpsPortalJson<RedactedSupportIntakeSnapshot>(
        "/api/admin/operations-hub/support-intake",
        { cache: "no-store" },
        "Failed to load support intake portal.",
      );
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failure.");
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  const runPoll = async () => {
    if (pollBusy) return;
    setPollBusy(true);
    setMessage(null);
    setError(null);
    try {
      const data = await fetchOpsPortalJson<{
        ok?: boolean;
        snapshot?: RedactedSupportIntakeSnapshot;
      }>("/api/admin/operations-hub/support-intake", { method: "POST" }, "Poll failed.");
      if (data.snapshot) setSnapshot(data.snapshot);
      setMessage("Poll cycle completed. Review intake queue and SUPPORT approval queue.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Poll failed.");
    } finally {
      setPollBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] p-4 text-slate-100 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">
              Support intake · operator console
            </p>
            <h1 className="text-2xl font-bold text-white">Engineering support intake portal</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Internal-only view of pending tenant support intakes and SUPPORT draft approvals.
              Tenants submit via /dashboard/support — this console never exposes worker endpoints to
              tenant sessions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/operations"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-cyan-600"
            >
              ← Operations hub
            </Link>
            <Link
              href="/dashboard/admin/approvals"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-cyan-200 hover:border-cyan-600"
            >
              SUPPORT approvals ({snapshot?.approvalQueueDepth ?? "…"})
            </Link>
            <button
              type="button"
              onClick={() => void loadSnapshot()}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-cyan-600"
            >
              Refresh
            </button>
            <button
              type="button"
              disabled={pollBusy}
              onClick={() => void runPoll()}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {pollBusy ? "Polling…" : "Run poll cycle"}
            </button>
          </div>
        </header>

        {error ? (
          <div className="rounded-xl border border-rose-900/50 bg-rose-950/30 p-4 text-sm text-rose-200">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 p-4 text-sm text-emerald-200">
            {message}
          </div>
        ) : null}

        {loading && !snapshot ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
            Loading support intake portal…
          </div>
        ) : null}

        {snapshot ? (
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-semibold text-white">Worker status</h2>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <p>
                  <span className="text-slate-500">Reachable:</span>{" "}
                  <span className={snapshot.worker.reachable ? "text-emerald-400" : "text-rose-400"}>
                    {snapshot.worker.reachable ? "Online" : "Offline"}
                  </span>
                </p>
                <p>
                  <span className="text-slate-500">Pending SUPPORT drafts:</span>{" "}
                  <span className="font-mono text-cyan-300">{snapshot.approvalQueueDepth}</span>
                </p>
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-semibold text-white">Open intakes</h2>
              <p className="mt-1 text-sm text-slate-400">
                CRM scope <span className="font-mono text-cyan-300">{snapshot.crmScope}</span> · polled{" "}
                {new Date(snapshot.polledAt).toLocaleString()}
              </p>
              <ul className="mt-4 space-y-3">
                {snapshot.intakes.length === 0 ? (
                  <li className="text-sm text-slate-500">No open support intakes in configured scope.</li>
                ) : (
                  snapshot.intakes.map((intake) => (
                    <li
                      key={intake.interactionId}
                      className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-slate-100">{intake.company}</span>
                        <span className="font-mono text-[10px] uppercase text-amber-300">
                          {intake.urgency}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {intake.objective} · {new Date(intake.occurredAt).toLocaleString()}
                      </div>
                      {intake.userNotes ? (
                        <p className="mt-2 text-slate-300">{intake.userNotes}</p>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
