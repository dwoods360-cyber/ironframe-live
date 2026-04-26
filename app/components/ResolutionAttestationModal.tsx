"use client";

import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  targetLabel: string;
  verifyInProgress?: boolean;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (resolutionNotes: string, evidenceFile: File | null) => Promise<void> | void;
};

export default function ResolutionAttestationModal({
  open,
  targetLabel,
  verifyInProgress = false,
  busy = false,
  error = null,
  onClose,
  onSubmit,
}: Props) {
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) {
      setNotes("");
      setFile(null);
      return;
    }
    const onEsc = (ev: KeyboardEvent) => {
      if (ev.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [busy, onClose, open]);

  if (!open) return null;

  const trimmed = notes.trim();
  const canSubmit = !busy && trimmed.length >= 10;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Resolution attestation"
        className="w-full max-w-lg rounded-md border border-amber-500/40 bg-slate-950 p-4 shadow-[0_0_24px_rgba(245,158,11,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xs font-black uppercase tracking-[0.13em] text-amber-300">
          Resolution attestation
        </h3>
        <p className="mt-1 text-[10px] text-slate-400">
          Submit restoration request for <span className="font-mono text-slate-200">{targetLabel}</span>.
        </p>

        <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wide text-slate-300">
          Resolution Notes (required)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Document what was mitigated, why restoration is safe, and any follow-up checks."
          rows={5}
          className="mt-1 w-full resize-y rounded border border-slate-700 bg-slate-900/60 px-2 py-1.5 text-[11px] text-slate-100 outline-none focus:border-amber-500/60"
        />

        <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wide text-slate-300">
          Evidence (Screenshot, Log, or PDF)
        </label>
        <input
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.log,.json"
          disabled={busy}
          onChange={(e) => {
            const selected = e.currentTarget.files?.[0] ?? null;
            setFile(selected);
          }}
          className="mt-1 block w-full rounded border border-slate-700 bg-slate-900/40 px-2 py-1.5 text-[10px] text-slate-300 disabled:opacity-60"
          title="Attach optional attestation evidence"
        />
        {file ? (
          <p className="mt-1 text-[9px] text-slate-400">
            Attached: <span className="font-mono text-slate-200">{file.name}</span>
          </p>
        ) : null}
        {verifyInProgress ? (
          <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-amber-300">
            Verifying Integrity...
          </p>
        ) : null}

        {error ? (
          <p className="mt-2 text-[10px] text-rose-300">
            Request failed: <span className="font-mono text-rose-200">{error}</span>
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-slate-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void onSubmit(trimmed, file)}
            className="rounded border border-amber-600/60 bg-amber-950/35 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-amber-100 disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Request Review"}
          </button>
        </div>
      </div>
    </div>
  );
}
