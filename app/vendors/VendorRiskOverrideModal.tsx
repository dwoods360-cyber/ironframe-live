"use client";

import { useEffect, useState } from "react";
import type { RiskTier } from "@/app/vendors/schema";

const TIERS: RiskTier[] = ["CRITICAL", "HIGH", "LOW"];

type VendorRiskOverrideModalProps = {
  vendorName: string;
  currentTier: RiskTier;
  onClose: () => void;
  onSubmit: (nextTier: RiskTier, justification: string) => void;
};

export default function VendorRiskOverrideModal({
  vendorName,
  currentTier,
  onClose,
  onSubmit,
}: VendorRiskOverrideModalProps) {
  const [nextTier, setNextTier] = useState<RiskTier>(currentTier);
  const [justification, setJustification] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const canSubmit = justification.trim().length >= 12 && nextTier !== currentTier;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vendor-risk-override-title"
        className="w-full max-w-md rounded-lg border border-amber-500/40 bg-slate-900 p-5 shadow-2xl"
      >
        <h2 id="vendor-risk-override-title" className="text-[11px] font-black uppercase tracking-widest text-amber-300">
          Override Risk Score
        </h2>
        <p className="mt-2 text-[10px] uppercase tracking-wider text-slate-400">{vendorName}</p>

        <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-slate-300">
          New risk tier
          <select
            value={nextTier}
            onChange={(event) => setNextTier(event.target.value as RiskTier)}
            className="mt-2 h-11 w-full rounded border border-slate-700 bg-slate-950 px-3 text-xs uppercase tracking-wider text-white outline-none focus:border-amber-500"
          >
            {TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-slate-300">
          Governance justification
          <textarea
            value={justification}
            onChange={(event) => setJustification(event.target.value)}
            rows={4}
            placeholder="Document why the registry tier should change..."
            className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-500"
          />
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center rounded border border-slate-700 bg-slate-950 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-300"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => onSubmit(nextTier, justification.trim())}
            className="inline-flex h-11 items-center rounded border border-amber-500/70 bg-amber-500/20 px-4 text-[10px] font-black uppercase tracking-wider text-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Submit Override
          </button>
        </div>
      </div>
    </div>
  );
}
