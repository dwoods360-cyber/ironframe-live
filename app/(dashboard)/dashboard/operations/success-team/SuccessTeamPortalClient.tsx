"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { SuccessTeamPortalSnapshot } from "@/app/lib/server/operationsTeamPortalsCore";
import { fetchOpsPortalJson } from "@/app/utils/fetchOpsPortalJson";

type RedactedSuccessTeamSnapshot = Omit<SuccessTeamPortalSnapshot, "tenantSlug" | "accounts" | "healthByDealId"> & {
  crmScope: string;
  accounts: Array<Omit<SuccessTeamPortalSnapshot["accounts"][number], "tenantId">>;
  healthByDealId: Record<
    string,
    Omit<SuccessTeamPortalSnapshot["healthByDealId"][string], "tenantId">
  >;
};

const HEALTH_TONE: Record<string, string> = {
  healthy: "text-emerald-400",
  watch: "text-amber-300",
  at_risk: "text-orange-400",
  critical: "text-rose-400",
};

export default function SuccessTeamPortalClient() {
  const [snapshot, setSnapshot] = useState<RedactedSuccessTeamSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollBusy, setPollBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOpsPortalJson<RedactedSuccessTeamSnapshot>(
        "/api/admin/operations-hub/success-team",
        { cache: "no-store" },
        "Failed to load IronSuccessTeam portal.",
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
        snapshot?: RedactedSuccessTeamSnapshot;
      }>("/api/admin/operations-hub/success-team", { method: "POST" }, "Poll failed.");
      if (data.snapshot) setSnapshot(data.snapshot);
      setMessage("Poll cycle completed. Review CLOSED_WON accounts and CS approval queue.");
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
            <p className="font-mono text-[10px] uppercase tracking-widest text-violet-400">
              IronSuccessTeam · CLOSED_WON
            </p>
            <h1 className="text-2xl font-bold text-white">Customer success interaction portal</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Monitor post-sale account health, trigger advisory poll cycles, and route drafts to the
              CUSTOMER_SUCCESS approval queue. Partner learning lives on Core{" "}
              <code className="text-slate-300">/docs</code> +{" "}
              <code className="text-slate-300">/get-started</code> — Approvals is HITL send only. CRM
              scope is server-resolved — not tenant-selectable.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Link
              href="/dashboard/operations"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-cyan-600"
            >
              ← Operations hub
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
              className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
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
            Loading IronSuccessTeam portal…
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
                  <span className="text-slate-500">Service:</span>{" "}
                  <span className="text-slate-200">{snapshot.worker.status ?? "—"}</span>
                </p>
                <Link
                  href="/dashboard/admin/approvals?kind=CUSTOMER_SUCCESS"
                  className="text-violet-300 hover:underline"
                >
                  Customer success advisory queue →
                </Link>
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-semibold text-white">CLOSED_WON accounts</h2>
              <p className="mt-1 text-sm text-slate-400">
                CRM scope <span className="font-mono text-cyan-300">{snapshot.crmScope}</span> · polled{" "}
                {new Date(snapshot.polledAt).toLocaleString()}
              </p>
              <ul className="mt-4 space-y-3">
                {snapshot.accounts.length === 0 ? (
                  <li className="text-sm text-slate-500">No CLOSED_WON accounts in the configured scope.</li>
                ) : (
                  snapshot.accounts.map((account) => {
                    const health = snapshot.healthByDealId[account.dealId];
                    return (
                      <li
                        key={account.dealId}
                        className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="font-medium text-slate-100">{account.company}</div>
                            <div className="text-xs text-slate-500">{account.dealTitle}</div>
                            <div className="mt-1 font-mono text-xs text-slate-400">
                              {account.fullName} · {account.email}
                            </div>
                          </div>
                          {health ? (
                            <div className="text-right">
                              <div
                                className={`font-mono text-sm font-bold ${HEALTH_TONE[health.healthBand] ?? "text-slate-300"}`}
                              >
                                {health.healthScore} · {health.healthBand.replace("_", " ")}
                              </div>
                              {health.signals.length ? (
                                <div className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">
                                  {health.signals.join(" · ")}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
