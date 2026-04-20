"use client";

import { useLayoutEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  falsePositiveClearanceDispositionAction,
  getThreatDigitalReceiptAction,
  passClearanceDispositionAction,
} from "@/app/actions/clearanceActions";
import { requestDashboardAuditRefresh } from "@/app/utils/dashboardAuditRefresh";
import {
  DISPOSITION_STATUS_FALSE_POSITIVE,
  DISPOSITION_STATUS_PASSED,
} from "@/app/lib/grc/dispositionConstants";
import { ThreatState } from "@prisma/client";

const DMZ_OPERATOR_COOKIE = "ironframe-operator-id";
const DMZ_DEFAULT_OPERATOR = "ironframe-dmz-console";

function ensureDispositionOperatorCookie(): void {
  if (typeof document === "undefined") return;
  if (document.cookie.split(";").some((c) => c.trim().startsWith(`${DMZ_OPERATOR_COOKIE}=`))) return;
  document.cookie = `${DMZ_OPERATOR_COOKIE}=${encodeURIComponent(DMZ_DEFAULT_OPERATOR)}; Path=/; Max-Age=604800; SameSite=Lax`;
}

type Props = {
  threatId: string;
  threatStatus?: string | null;
  dispositionStatus?: string | null;
  receiptHash?: string | null;
  compact?: boolean;
  onDispositionComplete?: () => void;
};

export default function ClearanceDispositionReceiptBar({
  threatId,
  threatStatus,
  dispositionStatus,
  receiptHash,
  compact = false,
  onDispositionComplete,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptBody, setReceiptBody] = useState<string | null>(null);
  const [checkboxEpoch, setCheckboxEpoch] = useState(0);
  const [receiptMeta, setReceiptMeta] = useState<{
    plane: string;
    goldenSource: boolean;
    rowReceiptHash: string | null;
  } | null>(null);

  useLayoutEffect(() => {
    ensureDispositionOperatorCookie();
  }, []);

  const status = (threatStatus ?? ThreatState.PIPELINE) as ThreatState;
  const canDisposition =
    status === ThreatState.PIPELINE || status === ThreatState.QUARANTINED;

  const passChecked = dispositionStatus === DISPOSITION_STATUS_PASSED;
  const fpChecked = dispositionStatus === DISPOSITION_STATUS_FALSE_POSITIVE;

  const afterSuccess = () => {
    requestDashboardAuditRefresh();
    router.refresh();
    onDispositionComplete?.();
  };

  const onPassChange = (checked: boolean) => {
    if (!checked || !canDisposition || pending) return;
    setError(null);
    startTransition(() => {
      void (async () => {
        const res = await passClearanceDispositionAction(threatId);
        if (!res.success) {
          setError(res.error);
          setCheckboxEpoch((n) => n + 1);
          return;
        }
        afterSuccess();
      })();
    });
  };

  const onFalsePositiveChange = (checked: boolean) => {
    if (!checked || !canDisposition || pending) return;
    setError(null);
    startTransition(() => {
      void (async () => {
        const res = await falsePositiveClearanceDispositionAction(threatId);
        if (!res.success) {
          setError(res.error);
          setCheckboxEpoch((n) => n + 1);
          return;
        }
        afterSuccess();
      })();
    });
  };

  const openReceipt = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const res = await getThreatDigitalReceiptAction(threatId);
        if (!res.success) {
          setError(res.error);
          return;
        }
        setReceiptBody(res.receiptJson);
        setReceiptMeta({
          plane: res.plane,
          goldenSource: res.goldenSource,
          rowReceiptHash: res.rowReceiptHash,
        });
        setReceiptOpen(true);
      })();
    });
  };

  const wrap = compact ? "gap-1.5" : "gap-2";

  return (
    <div className={`flex flex-col ${wrap}`}>
      <div className={`flex flex-wrap items-center ${compact ? "gap-2" : "gap-3"} text-[10px] font-semibold uppercase tracking-wide text-slate-300`}>
        <label className="flex cursor-pointer items-center gap-1.5 rounded border border-slate-600/80 bg-slate-950/60 px-2 py-1 hover:border-emerald-600/60">
          <input
            key={`pass-${checkboxEpoch}`}
            type="checkbox"
            checked={passChecked}
            disabled={!canDisposition || pending || fpChecked}
            onChange={(e) => onPassChange(e.target.checked)}
            className="accent-emerald-500"
          />
          <span className="text-emerald-200/95">Pass</span>
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 rounded border border-slate-600/80 bg-slate-950/60 px-2 py-1 hover:border-amber-600/60">
          <input
            key={`fp-${checkboxEpoch}`}
            type="checkbox"
            checked={fpChecked}
            disabled={!canDisposition || pending || passChecked}
            onChange={(e) => onFalsePositiveChange(e.target.checked)}
            className="accent-amber-500"
          />
          <span className="text-amber-200/95">False positive</span>
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={openReceipt}
          className="rounded border border-cyan-700/60 bg-cyan-950/40 px-2 py-1 text-cyan-100 hover:border-cyan-500/70 disabled:opacity-40"
        >
          Receipt
        </button>
        {receiptHash ? (
          <span className="font-mono text-[9px] font-normal normal-case tracking-normal text-slate-500" title="Anchored receipt hash on row">
            H:{receiptHash.slice(0, 10)}…
          </span>
        ) : null}
      </div>
      {error ? <p className="text-[10px] font-medium text-rose-300">{error}</p> : null}

      {receiptOpen && receiptBody ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Digital receipt"
        >
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg border border-cyan-800/50 bg-[#070b12] shadow-xl shadow-black/50">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/40 px-4 py-2">
              <div>
                <p className="font-mono text-[10px] font-black uppercase tracking-widest text-cyan-300/90">
                  Digital receipt · JSON
                </p>
                {receiptMeta ? (
                  <p className="mt-0.5 font-mono text-[9px] text-slate-500">
                    Plane: {receiptMeta.plane}
                    {receiptMeta.goldenSource ? " · Golden source (production)" : " · Shadow plane"}
                    {receiptMeta.rowReceiptHash
                      ? ` · Row hash ${receiptMeta.rowReceiptHash.slice(0, 14)}…`
                      : ""}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded border border-slate-600 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-800"
                onClick={() => {
                  setReceiptOpen(false);
                  setReceiptBody(null);
                  setReceiptMeta(null);
                }}
              >
                Close
              </button>
            </div>
            <pre className="min-h-0 flex-1 overflow-auto p-4 font-mono text-[10px] leading-relaxed text-slate-200">
              {receiptBody}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
