"use client";

import { X } from "lucide-react";

export type ForensicJustificationModalProps = {
  open: boolean;
  onClose: () => void;
  value: string;
  onChange: (next: string) => void;
  minChars: number;
  /** Ironwatch Stale Data — UI warns and uses amber counter. */
  isApiDegraded: boolean;
  title?: string;
};

/**
 * Forensic attestation editor with live counter — Ironlock raises minimum to 100 during API degraded (Ironwatch).
 */
export default function JustificationModal({
  open,
  onClose,
  value,
  onChange,
  minChars,
  isApiDegraded,
  title = "Forensic justification",
}: ForensicJustificationModalProps) {
  if (!open) return null;

  const len = value.trim().length;
  const ok = len >= minChars;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="max-h-[90vh] w-full max-w-lg rounded-lg border border-slate-700 bg-slate-950 p-4 shadow-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-200">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-600 p-1 text-slate-400 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isApiDegraded ? (
          <p className="mt-3 rounded border border-amber-700/50 bg-amber-950/35 px-2 py-2 text-[9px] font-bold uppercase leading-snug tracking-wide text-amber-100">
            DEGRADED STATE: API outage detected. 100-character forensic justification required for non-repudiation.
          </p>
        ) : null}

        <label className="mt-3 block text-[9px] font-bold uppercase text-slate-500">Your attestation</label>
        <textarea
          rows={10}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full resize-y rounded border border-slate-600 bg-slate-900/80 px-2 py-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500/60"
          placeholder={`Minimum ${minChars} characters — official human attestation for neutralization…`}
        />

        <p
          className={`mt-2 text-right text-[11px] font-mono font-semibold tabular-nums ${
            isApiDegraded ? (ok ? "text-amber-300" : "text-amber-400") : ok ? "text-emerald-400" : "text-rose-400"
          }`}
          aria-live="polite"
        >
          {len} / {minChars} characters required
        </p>

        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-600 px-3 py-1.5 text-[10px] font-bold uppercase text-slate-300 hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
