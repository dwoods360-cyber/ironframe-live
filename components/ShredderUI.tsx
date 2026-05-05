"use client";

import { useCallback, useEffect, useState } from "react";
import {
  executeDigitalShred,
  getShredderActorUserId,
  type AuditReceiptRow,
} from "@/app/actions/shredderActions";

const SHRED_WARNING =
  "WARNING: This action is permanent. Ironwatch will generate a certificate of destruction for your audit log.";

export function ShredderControl({
  chapterId,
  onComplete,
}: {
  chapterId: string;
  onComplete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actorId, setActorId] = useState("shadow-operator");

  useEffect(() => {
    void getShredderActorUserId().then(setActorId);
  }, []);

  const handleConfirm = useCallback(async () => {
    setBusy(true);
    try {
      const res = await executeDigitalShred(chapterId, actorId);
      if (!res.ok) {
        window.alert(res.error);
        return;
      }
      onComplete?.();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }, [actorId, chapterId, onComplete]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 w-full rounded border border-rose-700/70 bg-rose-950/40 px-2 py-1.5 text-[9px] font-black uppercase tracking-wide text-rose-100 hover:border-rose-500"
      >
        Shred
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shred-modal-title"
        >
          <div className="w-full max-w-md rounded-lg border border-rose-700/60 bg-slate-950 p-5 shadow-2xl">
            <h2 id="shred-modal-title" className="text-sm font-black uppercase tracking-widest text-rose-300">
              Digital shredder
            </h2>
            <p className="mt-3 text-[11px] leading-relaxed text-rose-100/95">{SHRED_WARNING}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
                className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-300 hover:border-slate-400 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleConfirm()}
                className="rounded border border-rose-600 bg-rose-900/60 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-rose-50 hover:border-rose-400 disabled:opacity-50"
              >
                {busy ? "Shredding…" : "Confirm destruction"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/**
 * Audit History — after shredding, the vault row disappears; only the Ironwatch receipt remains visible here as a “ghost” row.
 */
export default function ShredderUI({ receipts }: { receipts: AuditReceiptRow[] }) {
  if (receipts.length === 0) return null;

  return (
    <section className="mt-8 rounded-lg border border-slate-700/80 bg-slate-950/40">
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Audit history — destruction receipts</h2>
        <p className="mt-1 text-[9px] text-slate-600">
          Ghost rows: chapter content expunged per NIST 800-88; non-repudiable ledger entries only (Ironwatch SHA-256).
        </p>
      </div>
      <ul className="divide-y divide-slate-800/90">
        {receipts.map((r) => (
          <li
            key={r.id}
            className="border-dashed px-4 py-3 opacity-[0.88]"
          >
            <p className="font-mono text-[9px] font-bold uppercase tracking-wide text-slate-500">{r.receiptNumber}</p>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-300">{r.narrative}</p>
            <p className="mt-2 font-mono text-[9px] text-slate-600">
              Sector (snapshot): {r.sectorSnapshot ?? "—"} · ALE impact (cents): {r.aleImpactCents}
            </p>
            <p className="mt-1 font-mono text-[9px] text-violet-400/90">
              Ironwatch digest (SHA-256): {r.receiptHashSha256}
            </p>
            <p className="mt-1 text-[9px] text-slate-600">{r.shreddedAtIso}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
