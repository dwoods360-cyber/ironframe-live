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
  const [requeueBusy, setRequeueBusy] = useState(false);
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
    if (pollBusy || requeueBusy) return;
    setPollBusy(true);
    setMessage(null);
    setError(null);
    try {
      const data = await fetchOpsPortalJson<{
        ok?: boolean;
        snapshot?: RedactedSalesTeamSnapshot;
      }>(
        "/api/admin/operations-hub/salesteam",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "poll" }),
        },
        "Poll failed.",
      );
      if (data.snapshot) setSnapshot(data.snapshot);
      setMessage("Poll cycle completed. Review PROSPECT queue and SALES approval queue.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Poll failed.");
    } finally {
      setPollBusy(false);
    }
  };

  const runRequeueDrafts = async (opts?: {
    companyIncludes?: string;
    force?: boolean;
  }) => {
    if (pollBusy || requeueBusy) return;
    setRequeueBusy(true);
    setMessage(null);
    setError(null);
    try {
      const data = await fetchOpsPortalJson<{
        ok?: boolean;
        requeue?: {
          prospectsSeen: number;
          queued: Array<{ company: string; channel: string; refreshed?: boolean }>;
          skipped: Array<{ company: string; reason: string }>;
          errors: Array<{ company: string; message: string }>;
        };
        snapshot?: RedactedSalesTeamSnapshot;
      }>(
        "/api/admin/operations-hub/salesteam",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "requeue-drafts",
            companyIncludes: opts?.companyIncludes,
            force: opts?.force === true,
          }),
        },
        "Re-queue failed.",
      );
      if (data.snapshot) setSnapshot(data.snapshot);
      const q = data.requeue;
      if (!q) {
        setMessage("Re-queue completed.");
        return;
      }
      const queuedLabel = q.queued.map((r) => `${r.company} (${r.channel})`).join(", ") || "none";
      const skipLabel =
        q.skipped.length > 0
          ? ` Skipped: ${q.skipped.map((s) => `${s.company} — ${s.reason}`).join("; ")}.`
          : "";
      const errLabel =
        q.errors.length > 0
          ? ` Errors: ${q.errors.map((e) => `${e.company} — ${e.message}`).join("; ")}.`
          : "";
      if (q.queued.length === 0) {
        setError(
          `No new drafts queued (saw ${q.prospectsSeen} PROSPECTS).${skipLabel}${errLabel} Open Sales outreach queue only after a draft is queued.`,
        );
      } else {
        const refreshed = q.queued.some((r) => r.refreshed);
        setMessage(
          `${refreshed ? "Refreshed" : "Queued"} ${q.queued.length} PENDING draft(s): ${queuedLabel}.${skipLabel}${errLabel} Open Sales outreach queue for C1.`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Re-queue failed.");
    } finally {
      setRequeueBusy(false);
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
              href="/dashboard/operations/library/icp-shortlist#section-d"
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-cyan-600"
              title="C3 — log DISPATCH touch on ICP shortlist §D"
            >
              C3 · ICP shortlist §D
            </Link>
            <Link
              href="/dashboard/operations/workflow-review#talk-track"
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
              disabled={pollBusy || requeueBusy}
              onClick={() => void runPoll()}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {pollBusy ? "Polling…" : "Run poll cycle"}
            </button>
            <button
              type="button"
              disabled={pollBusy || requeueBusy}
              onClick={() => void runRequeueDrafts()}
              className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-4 py-2 text-sm font-medium text-emerald-100 hover:border-emerald-500 disabled:opacity-50"
              title="Create PENDING Approvals drafts for prospect-pool PROSPECTs (bypasses worker processedDeal after dry-run)"
            >
              {requeueBusy ? "Re-queuing…" : "Re-queue Approvals drafts"}
            </button>
            <button
              type="button"
              disabled={pollBusy || requeueBusy}
              onClick={() =>
                void runRequeueDrafts({ companyIncludes: "BlueRadius", force: true })
              }
              className="rounded-lg border border-cyan-700 bg-cyan-950/40 px-4 py-2 text-sm font-medium text-cyan-100 hover:border-cyan-500 disabled:opacity-50"
              title="Overwrite BlueRadius PENDING draft with C1-locked copy (Option A opener, no Path B, Dereck sign-off)"
            >
              {requeueBusy ? "Refreshing…" : "Refresh BlueRadius C1 copy"}
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
