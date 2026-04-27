"use client";

import { useMemo, useState, useTransition } from "react";
import type { BoardFailureAnalysis } from "@/lib/reporting/boardReportQueries";
import { toggleFailureExclusion } from "@/app/actions/dailySnapshotActions";
import { useRouter } from "next/navigation";

type Props = {
  analysis: BoardFailureAnalysis;
};

function prettyReason(reason: BoardFailureAnalysis["primaryStreakKiller"]): string {
  switch (reason) {
    case "WEBHOOK_FAILURE":
      return "Webhook Failure";
    case "SCORE_DIP":
      return "Score Dip";
    case "VIP_BREACH":
      return "VIP Breach";
    case "MANUAL_RESET":
      return "Manual Reset";
    default:
      return "No Reset Data";
  }
}

export default function FailureAnalysisCard({ analysis }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [errorByEvent, setErrorByEvent] = useState<Record<string, string>>({});
  const recentEvents = useMemo(() => analysis.events.slice(0, 8), [analysis.events]);

  const setDraft = (id: string, value: string) => {
    setReasonDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const onToggle = (event: BoardFailureAnalysis["events"][number], nextExcluded: boolean) => {
    const reason = nextExcluded
      ? (reasonDrafts[event.id] ?? event.exclusionReason ?? "").trim()
      : "";
    if (nextExcluded && reason.length < 3) {
      setErrorByEvent((prev) => ({ ...prev, [event.id]: "Exclusion Reason is required (min 3 chars)." }));
      return;
    }
    setErrorByEvent((prev) => ({ ...prev, [event.id]: "" }));
    startTransition(() => {
      void toggleFailureExclusion(event.id, nextExcluded, reason).then((res) => {
        if (!res.ok) {
          setErrorByEvent((prev) => ({ ...prev, [event.id]: res.error }));
          return;
        }
        router.refresh();
      });
    });
  };

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 print:border-zinc-300 print:bg-white">
      <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 print:text-zinc-600">
        Failure Analysis
      </h2>
      <p className="mt-1 text-[11px] text-zinc-400 print:text-zinc-700">
        Primary Streak Killer:{" "}
        <span className="font-semibold text-zinc-200 print:text-zinc-900">
          {prettyReason(analysis.primaryStreakKiller)}
        </span>{" "}
        ({analysis.primarySharePercent}% of resets)
      </p>
      <p className="mt-1 text-[11px] text-zinc-400 print:text-zinc-700">
        Average Streak Length:{" "}
        <span className="font-mono font-semibold text-zinc-200 print:text-zinc-900">
          {analysis.averageStreakLengthDays}
        </span>{" "}
        Days
      </p>

      <div className="mt-3 space-y-2">
        {analysis.bars.map((bar) => (
          <div key={bar.reason}>
            <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-[0.14em] text-zinc-500 print:text-zinc-700">
              <span>{prettyReason(bar.reason)}</span>
              <span className="font-mono">{bar.percent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded bg-zinc-800 print:bg-zinc-200">
              <div className="h-full rounded bg-rose-400/80 print:bg-rose-500" style={{ width: `${bar.percent}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-zinc-800/80 pt-3 print:hidden">
        <h3 className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">GRC Clean-Up Notes</h3>
        <div className="mt-2 space-y-3">
          {recentEvents.map((event) => (
            <div key={event.id} className="rounded border border-zinc-800 bg-zinc-900/30 p-2">
              <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-300">
                <span>
                  {prettyReason(event.reason)} · {new Date(event.resetAtIso).toLocaleString()} · Lost{" "}
                  <span className="font-mono">{event.lostStreakDays}</span>d
                </span>
                <button
                  type="button"
                  onClick={() => onToggle(event, !event.isExcludedFromAnalytics)}
                  disabled={isPending}
                  className={`rounded border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${
                    event.isExcludedFromAnalytics
                      ? "border-emerald-500/60 bg-emerald-950/30 text-emerald-200"
                      : "border-zinc-600 bg-zinc-900 text-zinc-200"
                  }`}
                >
                  {event.isExcludedFromAnalytics ? "Included" : "Hide from Analytics"}
                </button>
              </div>
              <input
                type="text"
                value={reasonDrafts[event.id] ?? event.exclusionReason ?? ""}
                onChange={(e) => setDraft(event.id, e.target.value)}
                placeholder="Exclusion Reason (e.g., Planned Lab Maintenance)"
                className="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-[10px] text-zinc-100 outline-none focus:border-zinc-500"
              />
              {errorByEvent[event.id] ? (
                <p className="mt-1 text-[9px] text-rose-300">{errorByEvent[event.id]}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
