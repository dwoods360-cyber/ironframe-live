"use client";

import { useId, useState } from "react";
import { Info } from "lucide-react";

const PRECISION_TOOLTIP =
  "Calculated using BigInt integer cents to ensure zero-float financial precision.";

type Props = {
  /** Display string, e.g. "$245.00M" — sourced from server BigInt formatting until Epic 7. */
  totalMitigated: string;
};

export default function IntegrityAleHeroCard({ totalMitigated }: Props) {
  const [open, setOpen] = useState(false);
  const tipId = useId();

  return (
    <section
      className="relative mb-4 overflow-hidden rounded-xl border border-teal-500/35 bg-gradient-to-br from-teal-950/55 via-slate-950 to-slate-950 px-5 py-4 shadow-[0_0_32px_rgba(20,184,166,0.12)] md:px-6 md:py-4"
      aria-labelledby="integrity-ale-hero-label"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_-20%,rgba(45,212,191,0.14),transparent)]" />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              id="integrity-ale-hero-label"
              className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-400/95 md:text-[11px]"
            >
              Autonomous healing impact (ALE)
            </p>
            <button
              type="button"
              className="inline-flex shrink-0 rounded-md p-1 text-slate-500 transition-colors hover:bg-teal-950/50 hover:text-teal-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500/60"
              aria-label="How ALE is calculated"
              aria-expanded={open}
              aria-describedby={open ? tipId : undefined}
              title={PRECISION_TOOLTIP}
              onClick={() => setOpen((v) => !v)}
            >
              <Info className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          </div>
          <p className="mt-2 font-mono text-3xl font-black tabular-nums tracking-tight text-white md:text-4xl lg:text-5xl">
            <span className="text-teal-300">{totalMitigated}</span>
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-snug text-slate-400 md:text-base">
            Total liability mitigated via deterministic agentic recovery.
          </p>
        </div>
      </div>
      {open ? (
        <p
          id={tipId}
          className="relative mt-3 rounded-md border border-slate-700/80 bg-slate-900/90 px-3 py-2 text-[11px] leading-relaxed text-slate-300"
          role="tooltip"
        >
          {PRECISION_TOOLTIP}
        </p>
      ) : null}
    </section>
  );
}
