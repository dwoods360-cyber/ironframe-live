"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { listMsspFreeDirectorySeeds } from "@/app/lib/ironleadsMsspFreeDirectorySeeds";
import type { IronleadsPortalSnapshot } from "@/app/lib/server/operationsTeamPortalsCore";
import { fetchOpsPortalJson } from "@/app/utils/fetchOpsPortalJson";

const FREE_DIRECTORY_SEED_COUNT = listMsspFreeDirectorySeeds().length;

export default function IronleadsPortalClient() {
  const [snapshot, setSnapshot] = useState<IronleadsPortalSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [harvestBusy, setHarvestBusy] = useState(false);
  const [researchBusy, setResearchBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [pasteText, setPasteText] = useState("");
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
    if (harvestBusy || researchBusy || importBusy) return;
    setHarvestBusy(true);
    setMessage(null);
    setError(null);
    try {
      const data = await fetchOpsPortalJson<{
        ok?: boolean;
        snapshot?: IronleadsPortalSnapshot;
        research?: {
          total: number;
          researched: number;
          skipped: number;
        } | null;
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
      const research = data.research;
      setMessage(
        research
          ? `Harvest + buying-committee research done — ${research.researched}/${research.total} researched, ${research.skipped} skipped. Open Why SUSPECT reports: light confirm → Promote (or HOLD). SalesTeam poll + DISPATCH stay human.`
          : "Harvest cycle completed. Review SUSPECT queue below.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Harvest failed.");
    } finally {
      setHarvestBusy(false);
    }
  };

  const runImportFreeDirectorySeeds = async () => {
    if (harvestBusy || researchBusy || importBusy) return;
    const ok = window.confirm(
      "Import curated free-directory MSSP seeds into prospect-pool as SUSPECTs? (Not a live Clutch scrape — starter pack only.)",
    );
    if (!ok) return;
    setImportBusy(true);
    setMessage(null);
    setError(null);
    try {
      const data = await fetchOpsPortalJson<{
        ok?: boolean;
        snapshot?: IronleadsPortalSnapshot;
        import?: { created: number; deduped: number; skipped: number; total: number };
        research?: { researched: number; total: number; skipped: number } | null;
      }>(
        "/api/admin/operations-hub/ironleads",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "import_free_directory_seeds" }),
        },
        "Directory seed import failed.",
      );
      if (data.snapshot) setSnapshot(data.snapshot);
      const imp = data.import;
      const research = data.research;
      setMessage(
        imp
          ? `Free-directory import: ${imp.created} new, ${imp.deduped} refreshed, ${imp.skipped} skipped (${imp.total} rows).${
              research
                ? ` Research ${research.researched}/${research.total}.`
                : ""
            } Review active SUSPECT queue — HOLD competitors, discard noise, Promote only with named buyer email.`
          : "Directory seed import completed.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Directory seed import failed.");
    } finally {
      setImportBusy(false);
    }
  };

  const runImportPaste = async () => {
    if (harvestBusy || researchBusy || importBusy) return;
    if (!pasteText.trim()) {
      setError("Paste at least one line: company, website [, trigger]");
      return;
    }
    setImportBusy(true);
    setMessage(null);
    setError(null);
    try {
      const data = await fetchOpsPortalJson<{
        ok?: boolean;
        snapshot?: IronleadsPortalSnapshot;
        import?: { created: number; deduped: number; skipped: number; total: number };
        research?: { researched: number; total: number; skipped: number } | null;
      }>(
        "/api/admin/operations-hub/ironleads",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "import_directory_paste",
            paste: pasteText,
          }),
        },
        "Paste import failed.",
      );
      if (data.snapshot) setSnapshot(data.snapshot);
      const imp = data.import;
      const research = data.research;
      setMessage(
        imp
          ? `Paste import: ${imp.created} new, ${imp.deduped} refreshed, ${imp.skipped} skipped (${imp.total} rows).${
              research ? ` Research ${research.researched}/${research.total}.` : ""
            }`
          : "Paste import completed.",
      );
      setPasteText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Paste import failed.");
    } finally {
      setImportBusy(false);
    }
  };

  const runBuyingCommitteeResearch = async () => {
    if (harvestBusy || researchBusy || importBusy) return;
    setResearchBusy(true);
    setMessage(null);
    setError(null);
    try {
      const data = await fetchOpsPortalJson<{
        ok?: boolean;
        snapshot?: IronleadsPortalSnapshot;
        research?: {
          total: number;
          researched: number;
          skipped: number;
        };
      }>(
        "/api/admin/operations-hub/ironleads",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "research_buying_committee" }),
        },
        "Buying-committee research failed.",
      );
      if (data.snapshot) setSnapshot(data.snapshot);
      const research = data.research;
      setMessage(
        research
          ? `Buying-committee research done — ${research.researched}/${research.total} researched, ${research.skipped} skipped. Open each Why SUSPECT report for CEO/CFO/CISO + candidate emails/phones.`
          : "Buying-committee research completed.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Buying-committee research failed.");
    } finally {
      setResearchBusy(false);
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
              Ironleads automates harvest + buying-committee research. You{" "}
              <span className="text-slate-300">review</span> SUSPECT reports, Promote when ready, or
              move channel-competitors to the HOLD archive for later retrieval.
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
              disabled={harvestBusy || researchBusy || importBusy}
              onClick={() => void runImportFreeDirectorySeeds()}
              className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-950/40 disabled:opacity-50"
              title="Import curated free-directory MSSP seeds (Clutch/public listings) into prospect-pool"
            >
              {importBusy ? "Importing…" : "Import free-directory seeds"}
            </button>
            <button
              type="button"
              disabled={harvestBusy || researchBusy || importBusy}
              onClick={() => void runBuyingCommitteeResearch()}
              className="rounded-lg border border-cyan-700 px-4 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-950/50 disabled:opacity-50"
              title="Re-run research only (e.g. after Cloud Run cron harvest without portal click)"
            >
              {researchBusy ? "Researching…" : "Research only"}
            </button>
            <button
              type="button"
              disabled={harvestBusy || researchBusy || importBusy}
              onClick={() => void runHarvest()}
              className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
            >
              {harvestBusy ? "Harvest + research…" : "Harvest + research"}
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
            <section className="rounded-xl border border-emerald-900/40 bg-emerald-950/15 p-5 lg:col-span-2">
              <h2 className="text-lg font-semibold text-emerald-100">
                Free-directory MSSP import
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Sales Nav not required. Paste firms from{" "}
                <a
                  className="text-emerald-200 underline hover:text-emerald-100"
                  href="https://clutch.co/it-services/cybersecurity"
                  target="_blank"
                  rel="noreferrer"
                >
                  Clutch
                </a>{" "}
                /{" "}
                <a
                  className="text-emerald-200 underline hover:text-emerald-100"
                  href="https://msspproviders.io/browse/"
                  target="_blank"
                  rel="noreferrer"
                >
                  MSSPProviders
                </a>{" "}
                (company, website), or load the curated starter pack. Lands on{" "}
                <span className="text-slate-300">prospect-pool</span> as MSSP SUSPECTs — still HITL
                before Promote.
              </p>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={4}
                placeholder={"CyberDuo, https://www.cyberduo.com, COMPLIANCE_JOB_POST\nNopalCyber, https://nopalcyber.com"}
                className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100 placeholder:text-slate-600"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={importBusy || harvestBusy || researchBusy}
                  onClick={() => void runImportPaste()}
                  className="rounded-lg border border-emerald-700 bg-emerald-950/50 px-4 py-2 text-sm font-medium text-emerald-50 hover:border-emerald-500 disabled:opacity-40"
                >
                  Import paste
                </button>
                <button
                  type="button"
                  disabled={importBusy || harvestBusy || researchBusy}
                  onClick={() => void runImportFreeDirectorySeeds()}
                  className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-emerald-700 disabled:opacity-40"
                >
                  Import starter pack ({FREE_DIRECTORY_SEED_COUNT})
                </button>
              </div>
            </section>

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
                Active review only (HOLD archive excluded). Promote when email-ready, or park on the
                report page after HITL.
              </p>
              <ul className="mt-4 space-y-2">
                {snapshot.suspects.length === 0 ? (
                  <li className="text-sm text-slate-500">
                    No active SUSPECTs. Run a harvest cycle, or restore from HOLD archive below.
                  </li>
                ) : (
                  snapshot.suspects.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-slate-100">{row.company}</span>
                        <div className="mt-0.5 font-mono text-xs text-slate-400">
                          score {row.priorityScore}
                          {row.detectedTrigger ? ` · ${row.detectedTrigger}` : ""}
                        </div>
                        <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                          <div>
                            Website:{" "}
                            {row.websiteUrl ? (
                              <a
                                href={row.websiteUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-cyan-300/90 hover:underline"
                              >
                                {row.websiteUrl}
                              </a>
                            ) : (
                              "—"
                            )}
                          </div>
                          <div>Address: {row.addressLine ?? "—"}</div>
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/operations/ironleads/suspects/${row.id}`}
                        className="shrink-0 text-xs text-cyan-300 hover:underline"
                      >
                        Why SUSPECT →
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="rounded-xl border border-amber-900/40 bg-amber-950/15 p-5 lg:col-span-2">
              <h2 className="text-lg font-semibold text-amber-100">HOLD archive</h2>
              <p className="mt-1 text-sm text-slate-400">
                Parked after operator review for later retrieval (channel-competitors, enrich-later).
                Not Path B cold DISPATCH targets until restored and re-qualified.
              </p>
              <ul className="mt-4 space-y-2">
                {(snapshot.holdArchive ?? []).length === 0 ? (
                  <li className="text-sm text-slate-500">
                    Empty — use <span className="text-amber-200/90">Move to HOLD archive</span> on a
                    SUSPECT report after HITL.
                  </li>
                ) : (
                  (snapshot.holdArchive ?? []).map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-900/30 bg-slate-950/40 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-slate-100">{row.company}</span>
                        <div className="mt-0.5 font-mono text-xs text-amber-200/80">
                          {row.holdClassification ?? "hold"}
                          {row.holdAt ? ` · ${row.holdAt}` : ""}
                        </div>
                        {row.holdReason ? (
                          <div className="mt-1 text-xs text-slate-500">{row.holdReason}</div>
                        ) : null}
                      </div>
                      <Link
                        href={`/dashboard/operations/ironleads/suspects/${row.id}`}
                        className="shrink-0 text-xs text-amber-200 hover:underline"
                      >
                        Open / restore →
                      </Link>
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
