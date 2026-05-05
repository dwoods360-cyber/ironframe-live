"use client";

import { useCallback, useState } from "react";
import {
  processClearanceRequest,
  submitClearanceElevationRequest,
} from "@/app/actions/clearanceActions";

type Props = {
  open: boolean;
  onClose: () => void;
  riskEventId: string;
  targetClearance: string;
  onResolved: (result: { approved: boolean; targetClearance?: string }) => void;
};

export default function ClearanceRequestModal({
  open,
  onClose,
  riskEventId,
  targetClearance,
  onResolved,
}: Props) {
  const [justification, setJustification] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => {
    setJustification("");
    setFeedback(null);
    setError(null);
    setBusy(false);
  }, []);

  const handleClose = useCallback(() => {
    if (busy) return;
    reset();
    onClose();
  }, [busy, onClose, reset]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setBusy(true);
    setFeedback(
      "🛡️ [IRONLOCK] | Background check initiated. Verification in progress (30s heartbeat)...",
    );

    const created = await submitClearanceElevationRequest({
      targetClearance,
      justification,
      riskEventId,
    });
    if (!created.ok) {
      setError(created.error);
      setFeedback(null);
      setBusy(false);
      return;
    }

    const processed = await processClearanceRequest(created.requestId);
    setBusy(false);

    if (!processed.ok) {
      setError(processed.error);
      setFeedback(null);
      setBusy(false);
      return;
    }

    if (processed.approved) {
      onResolved({ approved: true, targetClearance: processed.targetClearance });
    } else {
      onResolved({ approved: false });
    }
    reset();
    onClose();
  }, [justification, onClose, onResolved, reset, riskEventId, targetClearance]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clearance-modal-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-slate-600 bg-slate-950 p-5 shadow-2xl shadow-black/50">
        <h2 id="clearance-modal-title" className="text-sm font-black uppercase tracking-widest text-amber-200">
          Request clearance elevation
        </h2>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Target level: <span className="font-mono text-slate-300">{targetClearance.replace(/_/g, " ")}</span>
        </p>

        <div className="mt-4 rounded border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-[10px] leading-relaxed text-amber-100/95">
          <p className="font-black uppercase tracking-wide text-amber-300/90">Federal Background Check Authorization</p>
          <p className="mt-2 text-amber-100/85">
            By submitting this request, you authorize a simulated background verification suitable for Defense / Aerospace
            controlled unclassified information handling. False statements may result in denial and audit referral (simulation).
          </p>
        </div>

        <label className="mt-4 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Justification for Need-to-Know
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={4}
            disabled={busy}
            className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-2 py-2 text-[11px] text-slate-100 placeholder:text-slate-600"
            placeholder="Describe operational need for access to this restricted chapter..."
          />
        </label>

        {feedback ? (
          <p className="mt-3 animate-pulse text-[10px] leading-relaxed text-cyan-200/95">{feedback}</p>
        ) : null}
        {error ? (
          <p className="mt-3 text-[10px] text-rose-300">{error}</p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-300 hover:border-slate-400 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={busy || !justification.trim()}
            className="rounded border border-amber-600/80 bg-amber-950/50 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-amber-100 hover:border-amber-400 disabled:opacity-50"
          >
            {busy ? "Processing…" : "Submit to Ironlock"}
          </button>
        </div>
      </div>
    </div>
  );
}
