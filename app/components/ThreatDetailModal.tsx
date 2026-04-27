"use client";

import React, { useEffect } from "react";
import type { ThreatIntelEntry } from "@/lib/simulation/threatLibrary";

export type ThreatDetailModalProps = {
  open: boolean;
  entry: ThreatIntelEntry | null;
  onClose: () => void;
  onLaunchDrill: (entry: ThreatIntelEntry) => void;
  resolveSourceHref: (source: string) => string | null;
  isLaunching?: boolean;
};

export function ThreatDetailModal({
  open,
  entry,
  onClose,
  onLaunchDrill,
  resolveSourceHref,
  isLaunching = false,
}: ThreatDetailModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !entry) return null;

  const cite = resolveSourceHref(entry.source);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="threat-detail-title"
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-lg border border-zinc-700 bg-[#0a0a0f] shadow-2xl text-white"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-zinc-800 bg-[#0a0a0f]/95 px-4 py-3 backdrop-blur">
          <h2 id="threat-detail-title" className="text-sm font-black uppercase tracking-wide text-white leading-snug pr-2">
            {entry.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-300 hover:bg-zinc-800"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Source</p>
            {cite ? (
              <a
                href={cite}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline"
              >
                {entry.source}
              </a>
            ) : (
              <p className="text-[11px] text-zinc-300">{entry.source}</p>
            )}
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">Deep dive</p>
            <p className="text-[12px] leading-relaxed text-zinc-300 font-sans">{entry.summary}</p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={isLaunching}
              onClick={() => onLaunchDrill(entry)}
              className="rounded bg-rose-600 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-white hover:bg-rose-500 disabled:opacity-60"
            >
              {isLaunching ? "Launching…" : "Launch drill"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-zinc-600 bg-transparent px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:bg-zinc-900"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
