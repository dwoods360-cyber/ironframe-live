"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  executePhoenixResurrectionAction,
  getPhoenixResurrectionStatus,
  type PhoenixResurrectionStatusDto,
} from "@/app/actions/phoenixResurrectionActions";
import type { LastWillPlaintext } from "@/app/lib/lastWillAndTestament";
import IrontechPostMortemDashboard from "@/app/components/IrontechPostMortemDashboard";

function RestorationReportPanel({ report }: { report: LastWillPlaintext }) {
  return (
    <div className="mt-6 space-y-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-cyan-200">
        Restoration Report (Last Will and Testament)
      </p>
      <p className="text-[10px] text-slate-400">
        Archive {report.archiveId.slice(0, 8)}… · Constitutional hash{" "}
        {report.constitutionalHash ? `${report.constitutionalHash.slice(0, 12)}…` : "—"}
      </p>
      <div>
        <p className="mb-2 text-[10px] uppercase text-slate-500">Events leading to bricking</p>
        <ul className="max-h-48 space-y-1 overflow-y-auto rounded border border-slate-800 bg-black/40 p-2 text-[10px] text-slate-300">
          {report.auditEntries.slice(0, 20).map((e) => (
            <li key={e.id}>
              <span className="text-amber-200">{e.action}</span> — {e.operatorId} —{" "}
              {new Date(e.createdAt).toLocaleString()}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-2 text-[10px] uppercase text-slate-500">Witness log</p>
        <ul className="max-h-32 space-y-1 overflow-y-auto rounded border border-slate-800 bg-black/40 p-2 text-[10px] text-slate-300">
          {report.witnessLog.slice(0, 10).map((w) => (
            <li key={w.id}>
              {w.custodianRole} @ {w.clientIp} — fp {w.fingerprintHash.slice(0, 10)}…
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function AdminResurrectionPage() {
  const [status, setStatus] = useState<PhoenixResurrectionStatusDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPostMortem, setShowPostMortem] = useState(false);

  const refresh = useCallback(async () => {
    setStatus(await getPhoenixResurrectionStatus());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const unlocked = status?.unlocked ?? false;
  const report = status?.restorationReport;

  return (
    <div className="min-h-full bg-[#050509] p-6 font-mono">
      <div className="mx-auto max-w-3xl rounded border border-cyan-700/50 bg-slate-950/80 p-6">
        <p className="text-sm font-black uppercase tracking-[0.15em] text-cyan-200">
          Phoenix Protocol — /admin/resurrection
        </p>
        <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
          For User_00 after Tripartite Nuclear Override. Executes tenant redeploy, lifts constitutional
          emergency, and displays the forensic Last Will pulled from off-site storage.
        </p>

        {!unlocked ? (
          <div className="mt-6 rounded border border-rose-800/60 bg-rose-950/30 p-4 text-[10px] text-rose-200">
            Locked — complete Tripartite Nuclear Override during void to unlock Phoenix.
          </div>
        ) : (
          <p className="mt-4 text-[10px] text-emerald-300">Phoenix gate unlocked for active tenant.</p>
        )}

        {unlocked && report ? <RestorationReportPanel report={report} /> : null}

        {error ? <p className="mt-4 text-[10px] text-rose-300">{error}</p> : null}
        {message ? <p className="mt-4 text-[10px] text-emerald-300">{message}</p> : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!unlocked || busy}
            onClick={() => {
              void (async () => {
                setBusy(true);
                setError(null);
                setMessage(null);
                const r = await executePhoenixResurrectionAction();
                setBusy(false);
                if (!r.ok) {
                  setError(r.error);
                  return;
                }
                setMessage(
                  `Phoenix resurrection complete. New hash ${r.constitutionalHash.slice(0, 12)}…`,
                );
                setShowPostMortem(true);
                await refresh();
              })();
            }}
            className="rounded border border-cyan-500/70 bg-cyan-900/40 px-4 py-2 text-[10px] font-black uppercase text-cyan-100 disabled:opacity-45"
          >
            {busy ? "Resurrecting…" : "Execute Phoenix Resurrection"}
          </button>
          <Link
            href="/"
            className="rounded border border-slate-600 px-4 py-2 text-[10px] font-bold uppercase text-slate-300"
          >
            Command Center
          </Link>
        </div>

        {showPostMortem ? <IrontechPostMortemDashboard autoReveal /> : null}
      </div>
    </div>
  );
}
