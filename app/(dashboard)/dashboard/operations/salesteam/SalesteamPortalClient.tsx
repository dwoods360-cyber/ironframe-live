"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { fetchOpsPortalJson } from "@/app/utils/fetchOpsPortalJson";

type RedactedSalesTeamSnapshot = {
  generatedAt: string;
  crmScope: string;
  worker: { reachable: boolean; status: string | null };
  prospects: Array<{
    dealId: string;
    contactId: string;
    stage: string;
    dealTitle: string;
    valueCents: string;
    company: string;
    fullName: string;
    email: string;
    phone: string | null;
    industrySector: string | null;
    detectedTrigger: string | null;
    priorityScore: number;
    updatedAt: string;
  }>;
  polledAt: string;
};

export default function SalesteamPortalClient() {
  const [snapshot, setSnapshot] = useState<RedactedSalesTeamSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollBusy, setPollBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOpsPortalJson<RedactedSalesTeamSnapshot>(
        "/api/admin/operations-hub/salesteam",
        { cache: "no-store" },
        "Failed to load SalesTeam portal.",
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
        snapshot?: RedactedSalesTeamSnapshot;
      }>("/api/admin/operations-hub/salesteam", { method: "POST" }, "Poll failed.");
      if (data.snapshot) setSnapshot(data.snapshot);
      setMessage("Poll cycle completed. Review PROSPECT queue and SALES approval queue.");
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
            <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400">
              SalesTeam · PROSPECT outreach
            </p>
            <h1 className="text-2xl font-bold text-white">Sales interaction portal</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Monitor PROSPECT-stage deals, trigger poll cycles, and route StoryBrand drafts to the
              SALES approval queue. CRM scope is server-resolved.
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
              href="/dashboard/operations/workflow-review"
              className="rounded-lg border border-cyan-700 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-950/40"
            >
              Workflow review call assist
            </Link>
            <Link
              href="/dashboard/admin/approvals?kind=SALES"
              className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-2 text-sm text-amber-200 hover:border-amber-600"
            >
              Sales outreach queue
            </Link>
            <Link
              href="/operator/workflow-review-protocol.html"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-teal-800/50 bg-teal-950/30 px-4 py-2 text-sm font-medium text-teal-100 hover:border-teal-500"
            >
              Workflow review talk track
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
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
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
            Loading SalesTeam portal…
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
                  <span className="text-slate-500">CRM scope:</span>{" "}
                  <span className="font-mono text-cyan-300">{snapshot.crmScope}</span>
                </p>
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-semibold text-white">PROSPECT queue</h2>
              <p className="mt-1 text-sm text-slate-400">
                Polled {new Date(snapshot.polledAt).toLocaleString()}
              </p>
              <ul className="mt-4 space-y-3">
                {snapshot.prospects.length === 0 ? (
                  <li className="text-sm text-slate-500">No PROSPECT deals in configured CRM scope.</li>
                ) : (
                  snapshot.prospects.map((prospect) => (
                    <li
                      key={prospect.dealId}
                      className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-sm"
                    >
                      <div className="font-medium text-slate-100">{prospect.company}</div>
                      <div className="text-xs text-slate-500">{prospect.dealTitle}</div>
                      <div className="mt-1 font-mono text-xs text-slate-400">
                        {prospect.fullName} · priority {prospect.priorityScore}
                      </div>
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
