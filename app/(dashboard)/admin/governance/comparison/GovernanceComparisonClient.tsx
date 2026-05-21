"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  getGovernanceComparisonWithDiffsAction,
  oneClickAmendmentFromDriftAction,
  runIndustryScoutAction,
} from "@/app/actions/regulatoryPipelineActions";
import type { GovernanceComparisonMatrix } from "@/app/services/regulatoryIngestion";
import type { ComparisonDiffRow, CisoDriftNotification } from "@/app/types/regulatoryIngestion";

type ComparisonPayload = GovernanceComparisonMatrix & {
  diffRows?: ComparisonDiffRow[];
  cisoNotifications?: CisoDriftNotification[];
  lastScoutRunAt?: string | null;
};

export default function GovernanceComparisonClient() {
  const searchParams = useSearchParams();
  const alertFromUrl = searchParams.get("alert");
  const [data, setData] = useState<ComparisonPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [scouting, setScouting] = useState(false);
  const [amendBusy, setAmendBusy] = useState<string | null>(null);
  const [amendmentText, setAmendmentText] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const payload = await getGovernanceComparisonWithDiffsAction();
    setData(payload);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const onScout = () => {
    void (async () => {
      setScouting(true);
      await runIndustryScoutAction();
      setScouting(false);
      await refresh();
    })();
  };

  const onOneClickAmend = (alertId: string) => {
    void (async () => {
      setAmendBusy(alertId);
      const res = await oneClickAmendmentFromDriftAction(alertId);
      setAmendBusy(null);
      if (res.ok) setAmendmentText(res.markdown);
    })();
  };

  if (loading) {
    return <p className="p-8 text-sm text-slate-400">Loading regulatory vault cross-walk…</p>;
  }

  if (!data) {
    return <p className="p-8 text-sm text-rose-400">Comparison matrix unavailable.</p>;
  }

  const diffRows = data.diffRows ?? [];
  const cisoNotes = data.cisoNotifications ?? [];

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black uppercase tracking-widest text-violet-200">
              Governance comparison
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Ironsight scout + Ironscribe ingest · Irontally red/green diff ·{" "}
              {data.gapCount} static gap{data.gapCount === 1 ? "" : "s"}
              {diffRows.length > 0 ? ` · ${diffRows.length} live requirement blocks` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={scouting}
              onClick={onScout}
              className="rounded border border-cyan-600/60 px-3 py-1.5 text-[10px] font-bold uppercase text-cyan-100 disabled:opacity-50"
            >
              {scouting ? "Scouting…" : "Run industry scout"}
            </button>
            <Link
              href="/"
              className="rounded border border-slate-700 px-3 py-1.5 text-[10px] font-bold uppercase text-slate-300 hover:border-violet-600"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {cisoNotes.length > 0 ? (
          <div className="mt-4 space-y-2">
            {cisoNotes.map((n) => (
              <div
                key={n.id}
                className="rounded border border-rose-600/70 bg-rose-950/40 px-3 py-2 animate-pulse"
              >
                <p className="text-[9px] font-black uppercase text-rose-200">{n.pulseMessage}</p>
                <button
                  type="button"
                  disabled={amendBusy === n.alertId}
                  onClick={() => onOneClickAmend(n.alertId)}
                  className="mt-2 rounded border border-rose-400/60 px-2 py-1 text-[8px] font-bold uppercase text-rose-50 disabled:opacity-50"
                >
                  {amendBusy === n.alertId ? "Drafting…" : "1-click TAS amendment"}
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {amendmentText ? (
          <pre className="mt-4 max-h-48 overflow-y-auto rounded border border-violet-800/50 bg-black/40 p-3 text-[8px] text-slate-300 whitespace-pre-wrap">
            {amendmentText}
          </pre>
        ) : null}

        {diffRows.length > 0 ? (
          <section className="mt-6 rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-300">
              Live compliance diff (ingested regulations)
            </h2>
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              {diffRows.map((row) => (
                <div
                  key={row.requirementId}
                  className={`rounded border p-3 ${
                    row.diffTone === "red"
                      ? "border-rose-600/70 bg-rose-950/30"
                      : "border-emerald-700/50 bg-emerald-950/20"
                  }`}
                >
                  <p className="text-[9px] font-bold text-slate-200">
                    {row.authority} — {row.requirementTitle}
                  </p>
                  <p className="mt-1 text-[8px] text-slate-400">{row.requirementText.slice(0, 200)}…</p>
                  <p
                    className={`mt-2 text-[8px] font-black uppercase ${
                      row.diffTone === "red" ? "text-rose-300" : "text-emerald-300"
                    }`}
                  >
                    {row.status === "GAP" ? "GAP — not addressed in TAS.md" : "ALIGNED"}
                  </p>
                  {row.tasSection ? (
                    <p className="mt-1 text-[7px] text-cyan-400">TAS §{row.tasSection}</p>
                  ) : null}
                  {row.gapReason ? (
                    <p className="mt-1 text-[7px] text-rose-200/90">{row.gapReason}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-cyan-800/40 bg-slate-900/40 p-4">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-cyan-300">
              NIST SP 800-137 requirements
            </h2>
            <div className="mt-3 max-h-[50vh] space-y-3 overflow-y-auto pr-1">
              {data.nistMappings.map((row) => (
                <div
                  key={row.nistSectionId}
                  className={`rounded border p-3 ${
                    row.gap ? "border-rose-700/60 bg-rose-950/30" : "border-emerald-800/40 bg-emerald-950/20"
                  }`}
                >
                  <p className="text-[10px] font-bold text-cyan-100">
                    §{row.nistSectionId} — {row.nistTitle}
                  </p>
                  <p className="mt-1 text-[9px] text-slate-300">{row.nistRequirement}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-violet-800/40 bg-slate-900/40 p-4">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-violet-300">
              TAS.md directives
            </h2>
            <div className="mt-3 max-h-[50vh] space-y-3 overflow-y-auto pr-1">
              {data.nistMappings.map((row) => (
                <div
                  key={`tas-${row.nistSectionId}`}
                  className={`rounded border p-3 ${
                    row.gap ? "border-amber-700/50 bg-amber-950/20" : "border-emerald-800/40 bg-black/20"
                  }`}
                >
                  <p className="text-[10px] font-bold text-violet-100">
                    TAS §{row.tasSection}
                    {row.gap ? " · GAP" : " · ALIGNED"}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {row.tasDirectives.map((d) => (
                      <li key={d.id} className="text-[8px] text-slate-300">
                        <Link href={`/constitution/tas#${d.anchorId}`} className="text-cyan-400 hover:underline">
                          {d.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>

        {alertFromUrl ? (
          <p className="mt-4 text-[9px] text-amber-300">
            CISO alert context: {alertFromUrl} — use 1-click amendment above when drift is critical.
          </p>
        ) : null}
      </div>
    </div>
  );
}
