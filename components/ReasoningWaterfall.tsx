"use client";

import type { ReasoningWaterfallVM } from "@/app/utils/reasoningWaterfallFromIngestion";
import {
  GRC_GOLD_WATERFALL_CONTINUITY_CLEAR,
  GRC_GOLD_WATERFALL_CONTINUITY_DISSENT,
  GRC_GOLD_WATERFALL_STAGE_IRONSCRIBE,
  GRC_GOLD_WATERFALL_STAGE_IRONTRUST,
  GRC_GOLD_WATERFALL_STAGE_IRONWATCH,
} from "@/lib/constants/grcGold";

function StageChip({ ok }: { ok: boolean }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide ${
        ok ? "border border-emerald-700/50 bg-emerald-950/40 text-emerald-200" : "border border-slate-600 bg-slate-900 text-slate-500"
      }`}
    >
      {ok ? "Complete" : "Pending"}
    </span>
  );
}

export default function ReasoningWaterfall({ data }: { data: ReasoningWaterfallVM }) {
  return (
    <div className="mt-2 space-y-2 rounded border border-slate-700/60 bg-slate-950/50 p-2">
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Reasoning waterfall</p>
      <ol className="space-y-2">
        <li className="rounded border border-slate-800/80 bg-slate-900/40 p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] font-bold text-slate-200">{GRC_GOLD_WATERFALL_STAGE_IRONSCRIBE}</p>
            <StageChip ok={data.ironscribe.complete} />
          </div>
          <p className="mt-1 break-all font-mono text-[8px] text-slate-400">
            Hash: {data.ironscribe.documentHash || "—"}
          </p>
          <p className="mt-0.5 font-mono text-[8px] text-slate-500">Ref: {data.ironscribe.pageRef || "—"}</p>
        </li>
        <li className="rounded border border-slate-800/80 bg-slate-900/40 p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] font-bold text-slate-200">{GRC_GOLD_WATERFALL_STAGE_IRONTRUST}</p>
            <StageChip ok={data.irontrust.complete} />
          </div>
          <p className="mt-1 font-mono text-[8px] text-slate-400">
            Governed impact (cents): {data.irontrust.governedImpactCents || "—"}
          </p>
          {data.irontrust.formula ? (
            <p className="mt-0.5 text-[8px] leading-snug text-slate-500">{data.irontrust.formula}</p>
          ) : null}
        </li>
        <li className="rounded border border-slate-800/80 bg-slate-900/40 p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] font-bold text-slate-200">{GRC_GOLD_WATERFALL_STAGE_IRONWATCH}</p>
            <StageChip ok={data.ironwatch.complete} />
          </div>
          <p className="mt-1 text-[8px] text-slate-400">
            Audit continuity:{" "}
            <span className={data.ironwatch.shadowDissent ? "font-bold text-amber-300" : "font-semibold text-emerald-200/90"}>
              {data.ironwatch.shadowDissent ? GRC_GOLD_WATERFALL_CONTINUITY_DISSENT : GRC_GOLD_WATERFALL_CONTINUITY_CLEAR}
            </span>
          </p>
          <p className="mt-0.5 font-mono text-[8px] text-slate-500">
            Semantic distance {data.ironwatch.semanticDistance.toFixed(4)} · hybrid score{" "}
            {data.ironwatch.vectorRecallScore.toFixed(4)}
          </p>
        </li>
      </ol>
    </div>
  );
}
