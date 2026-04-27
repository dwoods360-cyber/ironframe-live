"use client";

type Props = {
  criticalExposureCount: number;
};

/** Level-5 synthetic targets with simulation touch (`lastAttackedAt` set). */
export default function ImpactProjectionWidget({ criticalExposureCount }: Props) {
  return (
    <div className="rounded-lg border border-rose-900/40 bg-rose-950/20 p-4 print:border-rose-200 print:bg-rose-50">
      <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-300/90 print:text-rose-900">
        Impact projection
      </h3>
      <p className="mt-2 text-[11px] leading-relaxed text-rose-100/90 print:text-rose-950">
        Critical Exposure:{" "}
        <span className="font-black tabular-nums text-white print:text-rose-900">{criticalExposureCount}</span> Level
        5 targets currently vulnerable
        <span className="text-rose-200/80 print:text-rose-800">
          {" "}
          (non-null <span className="font-mono">lastAttackedAt</span> in the synthetic population).
        </span>
      </p>
    </div>
  );
}
