"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { CircleHelp } from "lucide-react";
import { buildGovernanceGlossaryEntries } from "@/app/utils/governanceGlossary";

export const EXPOSURE_DEFINITION_IDS = [
  "industryAverage",
  "currentRisk",
  "potentialImpact",
  "grcGap",
] as const;

export type ExposureDefinitionId = (typeof EXPOSURE_DEFINITION_IDS)[number];

const IRONTRUST_FOOTNOTE =
  "Ledger amounts are stored as BigInt cents in the Irontrust engine; $ALE$ is shown in presentation currency for GRC review.";

const ID_TO_INDEX: Record<ExposureDefinitionId, number> = {
  industryAverage: 0,
  currentRisk: 1,
  potentialImpact: 2,
  grcGap: 3,
};

type ExposureDefinitionHintProps = {
  definitionId: ExposureDefinitionId;
  /** Industry sector label for the Industry Average definition (e.g. store `selectedIndustry`). */
  industryLabel?: string;
  className?: string;
};

/**
 * GRC-Gold: (?) trigger with hover (desktop) + click/tap (mobile) tooltip.
 */
export function ExposureDefinitionHint({
  definitionId,
  industryLabel = "General",
  className = "",
}: ExposureDefinitionHintProps) {
  const uid = useId();
  const panelId = `exposure-def-${uid}`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const visible = hover || pinned;

  const list = buildGovernanceGlossaryEntries(industryLabel);
  const idx = ID_TO_INDEX[definitionId];
  const { term: title, description: body } = list[idx]!;

  const close = useCallback(() => {
    setPinned(false);
    setHover(false);
  }, []);

  useEffect(() => {
    if (!pinned) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const el = wrapRef.current;
      if (el && !el.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [pinned, close]);

  return (
    <div
      ref={wrapRef}
      className={`relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        className="inline-flex shrink-0 rounded p-0.5 text-amber-400/80 outline-none transition-colors hover:text-amber-300 focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
        aria-expanded={visible}
        aria-controls={panelId}
        aria-label={`${title} — exposure definition`}
        onClick={() => setPinned((p) => !p)}
      >
        <CircleHelp className="h-3 w-3" strokeWidth={2.2} aria-hidden />
      </button>
      {visible ? (
        <div
          id={panelId}
          role="tooltip"
          className="absolute left-1/2 top-full z-[80] mt-1.5 w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-md border border-amber-500/25 bg-[#0a0908] px-2.5 py-2 text-left shadow-[0_8px_28px_rgba(0,0,0,0.55)] ring-1 ring-violet-500/15"
        >
          <p className="text-[9px] font-black uppercase tracking-widest text-amber-200/90">{title}</p>
          <p className="mt-1.5 text-[9px] font-sans leading-snug text-zinc-200/95">{body}</p>
          <p className="mt-2 border-t border-amber-500/15 pt-1.5 text-[8px] font-mono leading-snug text-violet-200/80">
            {IRONTRUST_FOOTNOTE}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function getExposureDefinitionTitle(id: ExposureDefinitionId, industryLabel = "General"): string {
  const list = buildGovernanceGlossaryEntries(industryLabel);
  return list[ID_TO_INDEX[id]]!.term;
}
