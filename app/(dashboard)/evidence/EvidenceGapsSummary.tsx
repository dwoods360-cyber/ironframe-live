"use client";

import { formatCentsToUSD } from "@/app/utils/formatCentsToUSD";
import type { CoverageFramework, GapRow } from "./EvidenceGapsPanel";

type Props = {
  framework: CoverageFramework;
  gaps: GapRow[];
  gapCount: number;
  validatedControls: number;
  requiredControls: number;
  loading?: boolean;
  busyControl: string | null;
  onOpenDrawer: () => void;
  onTriggerGap: (gap: GapRow) => void;
};

const PREVIEW_LIMIT = 3;

export default function EvidenceGapsSummary({
  framework,
  gaps,
  gapCount,
  validatedControls,
  requiredControls,
  loading = false,
  busyControl,
  onOpenDrawer,
  onTriggerGap,
}: Props) {
  const preview = gaps.slice(0, PREVIEW_LIMIT);
  const healthy = !loading && gapCount === 0;

  return (
    <section
      className="mb-6 rounded-lg border border-amber-800/40 bg-amber-950/10"
      aria-label="Control gaps summary"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-900/35 px-4 py-3">
        <div>
          <h2 className="text-[11px] font-black uppercase tracking-widest text-amber-300">Control gaps</h2>
          <p className="mt-1 text-[10px] text-slate-400">
            {loading ? (
              "Loading gap analysis…"
            ) : healthy ? (
              <>Export posture healthy · {validatedControls}/{requiredControls} controls validated ({framework})</>
            ) : (
              <>
                <span className="font-mono text-rose-200">{gapCount}</span> unresolved gap{gapCount === 1 ? "" : "s"} ·{" "}
                {validatedControls}/{requiredControls} validated ({framework})
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenDrawer}
          className="rounded border border-amber-700/70 bg-amber-950/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-100 hover:border-amber-500"
        >
          {healthy ? "View audit" : "Review all gaps →"}
        </button>
      </div>

      {!loading && preview.length > 0 ? (
        <ul className="divide-y divide-amber-900/25">
          {preview.map((gap) => (
            <li
              key={gap.controlId}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-[10px]"
            >
              <div className="min-w-0">
                <span className="font-mono text-slate-100">{gap.controlId}</span>
                <span className="ml-2 font-mono text-amber-200/90">
                  {formatCentsToUSD(String(gap.potentialAleExposureCents))}
                </span>
              </div>
              <button
                type="button"
                disabled={busyControl === gap.controlId}
                onClick={() => onTriggerGap(gap)}
                className="shrink-0 rounded border border-amber-700/70 bg-amber-950/40 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-amber-100 hover:border-amber-500 disabled:opacity-50"
              >
                {busyControl === gap.controlId ? "Triggering…" : "Stress test"}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && healthy ? (
        <p className="px-4 py-3 text-[10px] text-emerald-300/90">No framework gaps — readiness reflects validated controls.</p>
      ) : null}
    </section>
  );
}
