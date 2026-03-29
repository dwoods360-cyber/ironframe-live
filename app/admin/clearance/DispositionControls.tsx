"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  promoteThreatToSanctum,
  rejectAndArchiveThreat,
  escalateToSecOps,
  runIrongateSanitization,
} from "@/app/actions/clearanceActions";
import { requestDashboardAuditRefresh } from "@/app/utils/dashboardAuditRefresh";
import {
  parseIrongateScanFromIngestionDetails,
  type IrongateScanVerdict,
} from "@/app/utils/irongateScan";

type Props = {
  threatId: string;
  ingestionDetails: string | null;
};

const DMZ_OPERATOR_COOKIE = "ironframe-operator-id";
const DMZ_DEFAULT_OPERATOR = "ironframe-dmz-console";

/** Ensures server actions can read a non-HttpOnly operator id (mirrors ironframe-tenant cookie pattern). */
function ensureDmzOperatorCookie(): void {
  if (typeof document === "undefined") return;
  if (document.cookie.split(";").some((c) => c.trim().startsWith(`${DMZ_OPERATOR_COOKIE}=`))) return;
  document.cookie = `${DMZ_OPERATOR_COOKIE}=${encodeURIComponent(DMZ_DEFAULT_OPERATOR)}; Path=/; Max-Age=604800; SameSite=Lax`;
}

export default function DispositionControls({ threatId, ingestionDetails }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sanitizeError, setSanitizeError] = useState<string | null>(null);
  const [localScan, setLocalScan] = useState<IrongateScanVerdict | null>(null);
  const igniteOnceRef = useRef(false);

  useLayoutEffect(() => {
    ensureDmzOperatorCookie();
  }, []);

  const serverScan = useMemo(
    () => parseIrongateScanFromIngestionDetails(ingestionDetails),
    [ingestionDetails],
  );

  const [sanitizePending, setSanitizePending] = useState(
    () => !parseIrongateScanFromIngestionDetails(ingestionDetails),
  );

  const effectiveScan = serverScan ?? localScan;

  useEffect(() => {
    if (parseIrongateScanFromIngestionDetails(ingestionDetails)) return;
    if (igniteOnceRef.current) return;
    igniteOnceRef.current = true;
    setSanitizePending(true);
    setSanitizeError(null);
    void runIrongateSanitization(threatId)
      .then((res) => {
        if (res.success) {
          setLocalScan(res.irongateScan);
        } else {
          setSanitizeError(res.error);
        }
      })
      .finally(() => {
        setSanitizePending(false);
        router.refresh();
      });
  }, [threatId, ingestionDetails, router]);

  const onSuccess = () => {
    requestDashboardAuditRefresh();
    router.refresh();
  };

  const hasVerdict = effectiveScan != null;
  const isScanning =
    !hasVerdict && !sanitizeError && (sanitizePending || igniteOnceRef.current);
  const isClean = effectiveScan?.status === "CLEAN";
  const isMalicious = effectiveScan?.status === "MALICIOUS";

  if (sanitizeError && !effectiveScan) {
    return (
      <div className="flex max-w-[280px] flex-col items-end gap-2 text-right">
        <p className="text-[10px] font-semibold text-rose-300">
          Irongate scan failed: {sanitizeError}
        </p>
        <p className="text-[9px] text-slate-500">Refresh the page to retry.</p>
      </div>
    );
  }

  if (isScanning) {
    return (
      <div className="flex flex-col items-end gap-1">
        <p
          className="animate-pulse text-[9px] font-bold uppercase tracking-wide text-amber-200/95"
          role="status"
          aria-live="polite"
        >
          [🛡️ IRONGATE: SANITIZING PAYLOAD…]
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {isClean ? (
        <span className="rounded border border-emerald-600/60 bg-emerald-950/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-200">
          Irongate: Clean Payload
        </span>
      ) : null}
      {isMalicious ? (
        <span className="rounded border border-red-600/80 bg-red-950/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-200 ring-1 ring-red-500/50">
          Irongate: Malicious Signature Detected
        </span>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {isClean ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(() => {
                void (async () => {
                  const result = await promoteThreatToSanctum(threatId);
                  if (result.success) {
                    onSuccess();
                  } else {
                    setError(result.error);
                  }
                })();
              });
            }}
            className="shrink-0 rounded border border-emerald-600/70 bg-emerald-950/50 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wide text-emerald-100 hover:bg-emerald-900/60 disabled:opacity-50"
          >
            {pending ? "…" : "Verify & Promote to Ledger"}
          </button>
        ) : null}

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(() => {
              void (async () => {
                const result = await rejectAndArchiveThreat(threatId);
                if (result.success) {
                  onSuccess();
                } else {
                  setError(result.error);
                }
              })();
            });
          }}
          className={
            isMalicious
              ? "shrink-0 rounded border-2 border-red-500 bg-red-950/70 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wide text-red-100 shadow-lg shadow-red-950/50 ring-2 ring-red-500/40 hover:bg-red-900/60 disabled:opacity-50"
              : "shrink-0 rounded border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wide text-zinc-200 hover:bg-black disabled:opacity-50"
          }
        >
          {pending ? "…" : "Reject & Archive"}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(() => {
              void (async () => {
                const result = await escalateToSecOps(threatId);
                if (result.success) {
                  onSuccess();
                } else {
                  setError(result.error);
                }
              })();
            });
          }}
          className={
            isMalicious
              ? "shrink-0 rounded border-2 border-amber-500 bg-amber-950/50 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wide text-amber-100 shadow-lg shadow-amber-950/40 ring-2 ring-amber-400/50 hover:bg-amber-900/40 disabled:opacity-50"
              : "shrink-0 rounded border border-red-500/60 bg-transparent px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wide text-red-300 hover:bg-red-950/40 disabled:opacity-50"
          }
        >
          {pending ? "…" : "Escalate to SecOps"}
        </button>
      </div>
      {error ? (
        <span className="max-w-[260px] text-right text-[10px] text-rose-300">{error}</span>
      ) : null}
    </div>
  );
}
