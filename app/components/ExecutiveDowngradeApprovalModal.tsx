"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  EXECUTIVE_ADMIN_FIELD_LABELS,
  EXECUTIVE_ADMIN_KEY_LENGTH,
} from "@/app/config/executiveAdministrativeKeys";
import {
  POSTURE_DEGRADATION_PHASE_COOLDOWN,
  POSTURE_DEGRADATION_PHASE_PENDING,
} from "@/app/config/postureDegradation";
import CfoRiskImpactTable from "@/app/components/CfoRiskImpactTable";
import {
  abortPostureDowngrade,
  acknowledgeCfoFinancialRisk,
  getPostureDegradationStatus,
  submitTripleExecutiveSignatures,
  type PostureDegradationStatusDto,
} from "@/app/actions/postureDegradationActions";
import { useSustainabilityStaleLockdownBlocking } from "@/app/context/ConstitutionalIntegrityProvider";

type Props = {
  open: boolean;
  onClose: () => void;
  onWorkflowChange?: () => void;
};

export default function ExecutiveDowngradeApprovalModal({ open, onClose, onWorkflowChange }: Props) {
  const staleLockdownBlocking = useSustainabilityStaleLockdownBlocking();
  const [status, setStatus] = useState<PostureDegradationStatusDto | null>(null);
  const [ceoKey, setCeoKey] = useState("");
  const [cfoKey, setCfoKey] = useState("");
  const [cioKey, setCioKey] = useState("");
  const [abortKey, setAbortKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [ackBusy, setAckBusy] = useState(false);

  const refresh = useCallback(async () => {
    const s = await getPostureDegradationStatus();
    setStatus(s);
    onWorkflowChange?.();
    return s;
  }, [onClose, onWorkflowChange]);

  useEffect(() => {
    if (!open) return;
    void refresh();
    const id = window.setInterval(() => void refresh(), 1000);
    return () => window.clearInterval(id);
  }, [open, refresh]);

  const filterHex = (setter: (v: string) => void) => (raw: string) => {
    setter(raw.replace(/[^a-fA-F0-9]/g, "").slice(0, EXECUTIVE_ADMIN_KEY_LENGTH));
  };

  const keysComplete =
    ceoKey.length === EXECUTIVE_ADMIN_KEY_LENGTH &&
    cfoKey.length === EXECUTIVE_ADMIN_KEY_LENGTH &&
    cioKey.length === EXECUTIVE_ADMIN_KEY_LENGTH;

  if (!open) return null;

  const phase = status?.phase;
  const inCooldown = phase === POSTURE_DEGRADATION_PHASE_COOLDOWN;
  const awaitingSignatures = phase === POSTURE_DEGRADATION_PHASE_PENDING;
  const cfoAcknowledged = status?.cfoFinancialRiskAcknowledged ?? false;
  const riskReport = status?.riskImpactReport ?? null;

  return (
    <div
      className="fixed inset-0 z-[180] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="executive-downgrade-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded border-2 border-amber-600/80 bg-slate-950 px-6 py-6 font-mono text-amber-50 shadow-xl">
        <p id="executive-downgrade-title" className="text-sm font-black uppercase tracking-[0.15em] text-amber-200">
          Board-Level Approval — Triple-Executive Gate
        </p>
        <p className="mt-2 text-[10px] leading-relaxed text-amber-100/85">
          TRIPARTITE_LOCK → DUAL_LOCK requires three distinct 32-character administrative keys. After attestation, a
          24-hour cool-down runs before posture and constitutional hash update.
        </p>
        {staleLockdownBlocking ? (
          <div className="mt-3 rounded border border-violet-600/55 bg-violet-950/50 px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wide text-violet-200">
              Sustainability 24h+ outage lockdown
            </p>
            <p className="mt-1 text-[9px] leading-relaxed text-violet-100/90">
              Mutations are frozen until Ironwatch recovers or Tripartite emergency seal waiver is applied (Vault + CISO
              + Staff — not these board keys).
            </p>
            <Link
              href="/settings/config#stale-data-waiver"
              className="mt-2 inline-block text-[10px] font-black uppercase tracking-wide text-violet-300 underline underline-offset-2"
            >
              Resume Operations (Stale-Data Waiver)
            </Link>
          </div>
        ) : null}

        {inCooldown && status?.remainingLabel ? (
          <div className="mt-4 rounded border border-rose-600/60 bg-rose-950/40 px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-200">Cool-down active</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-rose-100">{status.remainingLabel}</p>
            <p className="mt-1 text-[9px] text-rose-300/80">
              Posture shifts to DUAL_LOCK when the timer reaches zero. Any executive may abort below.
            </p>
          </div>
        ) : null}

        {awaitingSignatures && riskReport ? (
          <CfoRiskImpactTable
            report={riskReport}
            acknowledged={cfoAcknowledged}
            acknowledgeBusy={ackBusy}
            onAcknowledge={() => {
              void (async () => {
                setAckBusy(true);
                setError(null);
                const r = await acknowledgeCfoFinancialRisk();
                setAckBusy(false);
                if (!r.ok) {
                  setError(r.error);
                  return;
                }
                await refresh();
              })();
            }}
          />
        ) : null}

        {awaitingSignatures ? (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-amber-300/90" htmlFor="exec-ceo-key">
                {EXECUTIVE_ADMIN_FIELD_LABELS.CEO} ({EXECUTIVE_ADMIN_KEY_LENGTH} hex)
              </label>
              <input
                id="exec-ceo-key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                maxLength={EXECUTIVE_ADMIN_KEY_LENGTH}
                value={ceoKey}
                onChange={(e) => filterHex(setCeoKey)(e.target.value)}
                className="mt-1 w-full rounded border border-amber-700/70 bg-black/50 px-3 py-2 text-[11px] tracking-widest text-amber-50 outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-amber-300/90" htmlFor="exec-cfo-key">
                {EXECUTIVE_ADMIN_FIELD_LABELS.CFO} ({EXECUTIVE_ADMIN_KEY_LENGTH} hex)
              </label>
              <input
                id="exec-cfo-key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                maxLength={EXECUTIVE_ADMIN_KEY_LENGTH}
                value={cfoKey}
                disabled={!cfoAcknowledged}
                onChange={(e) => filterHex(setCfoKey)(e.target.value)}
                className="mt-1 w-full rounded border border-amber-700/70 bg-black/50 px-3 py-2 text-[11px] tracking-widest text-amber-50 outline-none focus:border-amber-400 disabled:opacity-40"
              />
              {!cfoAcknowledged ? (
                <p className="mt-1 text-[9px] text-cyan-300/80">
                  CFO approval locked until Financial Risk is acknowledged above.
                </p>
              ) : null}
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-amber-300/90" htmlFor="exec-cio-key">
                {EXECUTIVE_ADMIN_FIELD_LABELS.CIO} ({EXECUTIVE_ADMIN_KEY_LENGTH} hex)
              </label>
              <input
                id="exec-cio-key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                maxLength={EXECUTIVE_ADMIN_KEY_LENGTH}
                value={cioKey}
                onChange={(e) => filterHex(setCioKey)(e.target.value)}
                className="mt-1 w-full rounded border border-amber-700/70 bg-black/50 px-3 py-2 text-[11px] tracking-widest text-amber-50 outline-none focus:border-amber-400"
              />
            </div>
            <button
              type="button"
              disabled={busy || !keysComplete || !cfoAcknowledged}
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  setError(null);
                  setMessage(null);
                  const result = await submitTripleExecutiveSignatures({
                    ceoKey: ceoKey.trim().toLowerCase(),
                    cfoKey: cfoKey.trim().toLowerCase(),
                    cioKey: cioKey.trim().toLowerCase(),
                  });
                  setBusy(false);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setCeoKey("");
                  setCfoKey("");
                  setCioKey("");
                  setMessage("Triple-executive attestation recorded. 24-hour cool-down started.");
                  await refresh();
                })();
              }}
              className="w-full rounded border border-amber-500 bg-amber-900/50 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-amber-50 disabled:opacity-45"
            >
              {busy ? "Attesting…" : "Submit Executive Signatures & Start Cool-Down"}
            </button>
          </div>
        ) : null}

        {(awaitingSignatures || inCooldown) && (
          <div className="mt-4 space-y-2 border-t border-slate-700 pt-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Abort downgrade</p>
            <input
              id="exec-abort-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              maxLength={EXECUTIVE_ADMIN_KEY_LENGTH}
              value={abortKey}
              onChange={(e) => filterHex(setAbortKey)(e.target.value)}
              className="w-full rounded border border-slate-600 bg-black/50 px-3 py-2 text-[11px] tracking-widest text-slate-100 outline-none focus:border-slate-400"
              placeholder="CEO, CFO, or CIO key to abort"
            />
            <button
              type="button"
              disabled={busy || abortKey.length !== EXECUTIVE_ADMIN_KEY_LENGTH}
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  setError(null);
                  const result = await abortPostureDowngrade(abortKey.trim().toLowerCase());
                  setBusy(false);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setAbortKey("");
                  setMessage("Administrative downgrade aborted.");
                  await refresh();
                })();
              }}
              className="w-full rounded border border-slate-500 bg-slate-800/60 px-3 py-2 text-[10px] font-black uppercase text-slate-200 disabled:opacity-45"
            >
              Abort Pending Downgrade
            </button>
          </div>
        )}

        {error ? <p className="mt-3 text-[10px] text-rose-300">{error}</p> : null}
        {message ? <p className="mt-3 text-[10px] text-emerald-300">{message}</p> : null}

        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-700 pt-4">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded border border-slate-600 px-3 py-1.5 text-[10px] font-bold uppercase text-slate-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
