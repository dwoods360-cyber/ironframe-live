"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { IronleadsPortalSnapshot } from "@/app/lib/server/operationsTeamPortalsCore";
import { fetchOpsPortalJson } from "@/app/utils/fetchOpsPortalJson";

export default function IronleadsPortalClient() {
  const [snapshot, setSnapshot] = useState<IronleadsPortalSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [harvestBusy, setHarvestBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOpsPortalJson<IronleadsPortalSnapshot>(
        "/api/admin/operations-hub/ironleads",
        { cache: "no-store" },
        "Failed to load Ironleads portal.",
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

  const runHarvest = async () => {
    if (harvestBusy) return;
    setHarvestBusy(true);
    setMessage(null);
    setError(null);
    try {
      const data = await fetchOpsPortalJson<{
        ok?: boolean;
        snapshot?: IronleadsPortalSnapshot;
      }>(
        "/api/admin/operations-hub/ironleads",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
        "Harvest failed.",
      );
      if (data.snapshot) setSnapshot(data.snapshot);
      setMessage("Harvest cycle completed. Review SUSPECT queue below.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Harvest failed.");
    } finally {
      setHarvestBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] p-4 text-slate-100 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
              Ironleads · SUSPECT intake
            </p>
            <h1 className="text-2xl font-bold text-white">Lead generation interaction portal</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Trigger OSINT harvest cycles, monitor the LangGraph pipeline, and review SUSPECT-stage
              contacts ingested into Ironboard CRM.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
              disabled={harvestBusy}
              onClick={() => void runHarvest()}
              className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
            >
              {harvestBusy ? "Harvesting…" : "Run harvest cycle"}
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
            Loading Ironleads portal…
          </div>
        ) : null}

        {snapshot ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-semibold text-white">Worker status</h2>
              <div className="mt-4 space-y-2 text-sm">
                <p>
                  <span className="text-slate-500">Reachable:</span>{" "}
                  <span className={snapshot.worker.reachable ? "text-emerald-400" : "text-rose-400"}>
                    {snapshot.worker.reachable ? "Online" : "Offline"}
                  </span>
                </p>
                <p>
                  <span className="text-slate-500">Status:</span>{" "}
                  <span className="text-slate-200">{snapshot.worker.status ?? "—"}</span>
                </p>
              </div>
              {snapshot.worker.pipeline?.length ? (
                <div className="mt-4">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">Pipeline nodes</p>
                  <p className="mt-1 font-mono text-xs text-cyan-300">
                    {snapshot.worker.pipeline.join(" → ")}
                  </p>
                </div>
              ) : null}
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-2">
              <h2 className="text-lg font-semibold text-white">SUSPECT queue</h2>
              <p className="mt-1 text-sm text-slate-400">
                Recent contacts created by Ironleads ingress — promoted to PROSPECT via SalesTeam.
              </p>
              <ul className="mt-4 space-y-2">
                {snapshot.suspects.length === 0 ? (
                  <li className="text-sm text-slate-500">No SUSPECT contacts yet. Run a harvest cycle.</li>
                ) : (
                  snapshot.suspects.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-slate-100">{row.company}</span>
                      <span className="font-mono text-xs text-slate-400">
                        score {row.priorityScore}
                        {row.detectedTrigger ? ` · ${row.detectedTrigger}` : ""}
                      </span>
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
