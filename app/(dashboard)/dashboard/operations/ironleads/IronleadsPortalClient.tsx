"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  listMsspFreeDirectorySeeds,
  parseDirectoryImportPaste,
} from "@/app/lib/ironleadsMsspFreeDirectorySeeds";
import type { IronleadsPortalSnapshot } from "@/app/lib/server/operationsTeamPortalsCore";
import { fetchOpsPortalJson } from "@/app/utils/fetchOpsPortalJson";

const FREE_DIRECTORY_SEED_COUNT = listMsspFreeDirectorySeeds().length;
const PASTE_DRAFT_KEY = "ironleads.directoryPasteDraft.v1";
const PASTE_MAX_ROWS = 100;

export default function IronleadsPortalClient() {
  const [snapshot, setSnapshot] = useState<IronleadsPortalSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [harvestBusy, setHarvestBusy] = useState(false);
  const [researchBusy, setResearchBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [pasteText, setPasteText] = useState("");
  /** When on, paste/seed import and pull-next-20 also run buying-committee research on the active 20. */
  const [runResearchAfterImport, setRunResearchAfterImport] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const draft = window.localStorage.getItem(PASTE_DRAFT_KEY);
      if (draft?.trim()) setPasteText(draft);
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  useEffect(() => {
    try {
      if (pasteText.trim()) window.localStorage.setItem(PASTE_DRAFT_KEY, pasteText);
      else window.localStorage.removeItem(PASTE_DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }, [pasteText]);

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
        import?: {
          created: number;
          deduped: number;
          skipped: number;
          total: number;
          keptActive?: number;
          parkedPending?: number;
          activeCap?: number;
          results?: Array<{ companyName: string; skipped?: boolean; skipReason?: string }>;
        };
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
          body: JSON.stringify({
            action: "import_free_directory_seeds",
            runResearchAfterImport,
          }),
        },
        "Directory seed import failed.",
      );
      if (data.snapshot) setSnapshot(data.snapshot);
      const imp = data.import;
      const research = data.research;
      const skipSample = (imp?.results ?? [])
        .filter((r) => r.skipped && r.skipReason)
        .slice(0, 3)
        .map((r) => `${r.companyName}: ${r.skipReason}`)
        .join("; ");
      const researchNote = research
        ? ` Research: ${research.researched}/${research.total} researched, ${research.skipped} skipped.`
        : runResearchAfterImport
          ? " Research skipped (nothing to run)."
          : " Research off — use Research only when ready.";
      setMessage(
        imp
          ? `Free-directory import: ${imp.created} new, ${imp.deduped} refreshed, ${imp.skipped} skipped. Active batch kept ${imp.keptActive ?? "—"} / pending ${imp.parkedPending ?? 0} (cap ${imp.activeCap ?? 20}).${researchNote}${
              skipSample ? ` Skips: ${skipSample}` : ""
            }`
          : "Directory seed import completed.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Directory seed import failed.");
    } finally {
      setImportBusy(false);
    }
  };

  const pastePreview = parseDirectoryImportPaste(pasteText);
  const pasteLineCount = pasteText
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter(Boolean).length;

  const runImportPaste = async () => {
    if (harvestBusy || researchBusy || importBusy) return;
    if (!pasteText.trim()) {
      setError("Paste is empty. One company per line (optional: company, https://site.com).");
      return;
    }
    if (pastePreview.length === 0) {
      setError(
        `Could not parse any firms from ${pasteLineCount} non-empty line(s). Use one company per line.`,
      );
      return;
    }
    if (pastePreview.length > PASTE_MAX_ROWS) {
      setError(
        `${pastePreview.length} firms in the box (max ${PASTE_MAX_ROWS} per import). Clear the box and paste a batch of ≤${PASTE_MAX_ROWS} from your text file.`,
      );
      return;
    }
    setImportBusy(true);
    setMessage(null);
    setError(null);
    try {
      const data = await fetchOpsPortalJson<{
        ok?: boolean;
        snapshot?: IronleadsPortalSnapshot;
        import?: {
          created: number;
          deduped: number;
          skipped: number;
          total: number;
          keptActive?: number;
          parkedPending?: number;
          activeCap?: number;
          results?: Array<{ companyName: string; skipped?: boolean; skipReason?: string }>;
        };
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
          body: JSON.stringify({
            action: "import_directory_paste",
            paste: pasteText,
            runResearchAfterImport,
          }),
        },
        "Paste import failed.",
      );
      if (data.snapshot) setSnapshot(data.snapshot);
      const imp = data.import;
      const research = data.research;
      const skipSample = (imp?.results ?? [])
        .filter((r) => r.skipped && r.skipReason)
        .slice(0, 5)
        .map((r) => `${r.companyName}: ${r.skipReason}`)
        .join("; ");
      const researchNote = research
        ? ` Research: ${research.researched}/${research.total} researched, ${research.skipped} skipped.`
        : runResearchAfterImport
          ? " Research skipped (nothing to run)."
          : " Research off — use Research only when ready.";
      setMessage(
        imp
          ? `Paste import: ${imp.created} new, ${imp.deduped} refreshed, ${imp.skipped} skipped. Kept ${imp.keptActive ?? "—"} in active batch; parked ${imp.parkedPending ?? 0} in pending (cap ${imp.activeCap ?? 20}).${researchNote} Pull next 20 when this batch is done.${
              skipSample ? ` Skips: ${skipSample}` : ""
            }`
          : "Paste import completed.",
      );
      // Clear draft only after a successful import so a failed/timeout run never wipes the list.
      setPasteText("");
      try {
        window.localStorage.removeItem(PASTE_DRAFT_KEY);
      } catch {
        /* ignore */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Paste import failed.");
    } finally {
      setImportBusy(false);
    }
  };

  const runPullPendingBatch = async () => {
    if (harvestBusy || researchBusy || importBusy) return;
    setImportBusy(true);
    setMessage(null);
    setError(null);
    try {
      const data = await fetchOpsPortalJson<{
        ok?: boolean;
        snapshot?: IronleadsPortalSnapshot;
        pull?: {
          pulled: number;
          remainingPending: number;
          activeCount: number;
          activeCap: number;
        };
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
          body: JSON.stringify({
            action: "pull_pending_batch",
            runResearchAfterImport,
          }),
        },
        "Pull pending batch failed.",
      );
      if (data.snapshot) setSnapshot(data.snapshot);
      const pull = data.pull;
      const research = data.research;
      const researchNote = research
        ? ` Research: ${research.researched}/${research.total} researched, ${research.skipped} skipped.`
        : "";
      setMessage(
        pull
          ? pull.pulled === 0
            ? `Active queue already at ${pull.activeCount}/${pull.activeCap}. Finish or HOLD current rows, then pull again. Pending left: ${pull.remainingPending}.`
            : `Pulled ${pull.pulled} from pending → active (${pull.activeCount}/${pull.activeCap}). ${pull.remainingPending} still pending.${
                researchNote ||
                (runResearchAfterImport
                  ? ""
                  : " Research off — use Research only when ready.")
              }`
          : "Pull completed.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pull pending batch failed.");
    } finally {
      setImportBusy(false);
    }
  };

  const runParkExcessActive = async () => {
    if (harvestBusy || researchBusy || importBusy) return;
    const ok = window.confirm(
      "Park excess active SUSPECTs into pending (keep newest 20)? Use if the active queue is already overloaded.",
    );
    if (!ok) return;
    setImportBusy(true);
    setMessage(null);
    setError(null);
    try {
      const data = await fetchOpsPortalJson<{
        ok?: boolean;
        snapshot?: IronleadsPortalSnapshot;
        park?: { keptActive: number; parkedPending: number; activeCap: number };
      }>(
        "/api/admin/operations-hub/ironleads",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "park_excess_active" }),
        },
        "Park excess failed.",
      );
      if (data.snapshot) setSnapshot(data.snapshot);
      const park = data.park;
      setMessage(
        park
          ? `Trimmed active to ${park.keptActive}/${park.activeCap}; parked ${park.parkedPending} into pending.`
          : "Park excess completed.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Park excess failed.");
    } finally {
      setImportBusy(false);
    }
  };

  const runBuyingCommitteeResearch = async () => {
    if (harvestBusy || researchBusy || importBusy) return;
    setResearchBusy(true);
    setMessage(null);
    setError(null);
    type ResearchPayload = {
      total: number;
      researched: number;
      skipped: number;
      batchLimit?: number;
      remaining?: number;
      hasMore?: boolean;
      cooledDown?: number;
    };
    const maxRounds = 5;
    let rounds = 0;
    let researchedSum = 0;
    let skippedSum = 0;
    let lastRemaining = 0;
    try {
      // Server batches (~5) under Vercel 120s; client continues until queue cools down.
      while (rounds < maxRounds) {
        rounds += 1;
        setMessage(
          rounds === 1
            ? "Researching… (batched to avoid gateway timeouts)"
            : `Researching… batch ${rounds}/${maxRounds}`,
        );
        const data = await fetchOpsPortalJson<{
          ok?: boolean;
          snapshot?: IronleadsPortalSnapshot;
          research?: ResearchPayload;
        }>(
          "/api/admin/operations-hub/ironleads",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "research_buying_committee",
              researchBatchLimit: 5,
            }),
          },
          "Buying-committee research failed.",
        );
        if (data.snapshot) setSnapshot(data.snapshot);
        const research = data.research;
        if (!research) break;
        researchedSum += research.researched;
        skippedSum += research.skipped;
        lastRemaining = research.remaining ?? 0;
        if (!research.hasMore || research.total === 0) break;
      }
      const moreHint =
        lastRemaining > 0
          ? ` ${lastRemaining} still eligible — click Research only again.`
          : "";
      setMessage(
        `Buying-committee research done — ${researchedSum} researched, ${skippedSum} skipped across ${rounds} batch(es).${moreHint} Open each Why SUSPECT report for CEO/CFO/CISO + candidate emails/phones.`,
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
                Paste MSSPProviders cards (blocks between =========) or one company per line. Only
                the firm name is imported — chips/blurbs ignored. Max {PASTE_MAX_ROWS} per import.
              </p>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={8}
                placeholder={"CyberDuo, https://www.cyberduo.com\nNopalCyber\nPacketlabs | https://www.packetlabs.com"}
                className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100 placeholder:text-slate-600"
              />
              <p
                className={`mt-2 font-mono text-xs ${
                  pastePreview.length > PASTE_MAX_ROWS
                    ? "text-rose-300"
                    : pastePreview.length > 0
                      ? "text-emerald-300/90"
                      : "text-slate-500"
                }`}
              >
                Parsed {pastePreview.length} firm{pastePreview.length === 1 ? "" : "s"}
                {pasteLineCount !== pastePreview.length
                  ? ` from ${pasteLineCount} non-empty line(s)`
                  : ""}
                {pastePreview.length > PASTE_MAX_ROWS
                  ? ` — over max ${PASTE_MAX_ROWS}; split the paste`
                  : pastePreview.length > 0
                    ? " — ready to import"
                    : " — nothing to import yet"}
                {pastePreview[0]?.companyName
                  ? ` · first: ${pastePreview[0].companyName}${
                      pastePreview[0].websiteUrl ? ` (${pastePreview[0].websiteUrl})` : " (no website yet)"
                    }`
                  : ""}
              </p>
              <label className="mt-3 flex items-start gap-2 text-xs text-emerald-100/90">
                <input
                  type="checkbox"
                  checked={runResearchAfterImport}
                  onChange={(e) => setRunResearchAfterImport(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Research after import / pull — runs buying-committee research on the active 20
                  after paste, starter pack, or Pull next 20. Uncheck if the request may time out;
                  use <span className="text-cyan-200">Research only</span> instead.
                </span>
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={importBusy || harvestBusy || researchBusy || pastePreview.length === 0}
                  onClick={() => void runImportPaste()}
                  className="rounded-lg border border-emerald-700 bg-emerald-950/50 px-4 py-2 text-sm font-medium text-emerald-50 hover:border-emerald-500 disabled:opacity-40"
                >
                  {importBusy ? "Importing…" : `Import paste (${pastePreview.length})`}
                </button>
                <button
                  type="button"
                  disabled={importBusy || harvestBusy || researchBusy}
                  onClick={() => void runImportFreeDirectorySeeds()}
                  className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-emerald-700 disabled:opacity-40"
                >
                  Import starter pack ({FREE_DIRECTORY_SEED_COUNT})
                </button>
                <button
                  type="button"
                  disabled={importBusy || harvestBusy || researchBusy}
                  onClick={() => void runPullPendingBatch()}
                  className="rounded-lg border border-cyan-700 px-4 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-950/40 disabled:opacity-40"
                  title="Fill active queue up to 20 from the pending pool (oldest first)"
                >
                  Pull next 20 from pending
                </button>
                <button
                  type="button"
                  disabled={importBusy || harvestBusy || researchBusy}
                  onClick={() => void runParkExcessActive()}
                  className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-400 disabled:opacity-40"
                  title="If active is already bloated, keep newest 20 and park the rest"
                >
                  Trim active → pending
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
                Named buyers and fullest dossiers first. Pending and HOLD are separate. Showing{" "}
                {snapshot.suspects.length}
                {typeof snapshot.activeCount === "number"
                  ? ` of ${snapshot.activeCount} active`
                  : ""}
                .
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
                          readiness {row.readinessScore ?? "—"}
                          {row.namedBuyerName ? ` · buyer ${row.namedBuyerName}` : ""}
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

            <section className="rounded-xl border border-sky-900/40 bg-sky-950/15 p-5 lg:col-span-2">
              <h2 className="text-lg font-semibold text-sky-100">Pending pool</h2>
              <p className="mt-1 text-sm text-slate-400">
                Directory overflow waiting for the next batch. Oldest first — use{" "}
                <span className="text-sky-200/90">Pull next 20 from pending</span> when the active
                queue has room. Showing {(snapshot.pendingPool ?? []).length}
                {typeof snapshot.pendingCount === "number"
                  ? ` of ${snapshot.pendingCount} pending`
                  : ""}
                .
              </p>
              <ul className="mt-4 space-y-2">
                {(snapshot.pendingPool ?? []).length === 0 ? (
                  <li className="text-sm text-slate-500">
                    Empty — paste imports beyond the active 20 land here automatically.
                  </li>
                ) : (
                  (snapshot.pendingPool ?? []).map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-900/30 bg-slate-950/40 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-slate-100">{row.company}</span>
                        <div className="mt-0.5 font-mono text-xs text-sky-200/80">
                          pending_batch
                          {row.websiteUrl ? ` · ${row.websiteUrl}` : ""}
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/operations/ironleads/suspects/${row.id}`}
                        className="shrink-0 text-xs text-sky-200 hover:underline"
                      >
                        Open →
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="rounded-xl border border-amber-900/40 bg-amber-950/15 p-5 lg:col-span-2">
              <h2 className="text-lg font-semibold text-amber-100">HOLD archive</h2>
              <p className="mt-1 text-sm text-slate-400">
                Parked after operator review (channel-competitors, enrich-later). Separate from the
                pending pool. Not Path B cold until restored and re-qualified.
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
