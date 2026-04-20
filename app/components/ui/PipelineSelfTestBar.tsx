"use client";

import { useLayoutEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSystemConfigStore } from "@/app/store/systemConfigStore";
import { getThreatDigitalReceiptAction } from "@/app/actions/clearanceActions";
import { submitOperationalSelfTestPassAction } from "@/app/actions/operationalDeficiencyActions";
import { requestDashboardAuditRefresh } from "@/app/utils/dashboardAuditRefresh";
import { DiagnosticReportModal } from "@/app/components/ui/DiagnosticReportModal";

const PIPELINE_COMPONENT = "app/components/ThreatPipeline.tsx";

const DMZ_OPERATOR_COOKIE = "ironframe-operator-id";
const DMZ_DEFAULT_OPERATOR = "ironframe-dmz-console";

function ensureDispositionOperatorCookie(): void {
  if (typeof document === "undefined") return;
  if (document.cookie.split(";").some((c) => c.trim().startsWith(`${DMZ_OPERATOR_COOKIE}=`))) return;
  document.cookie = `${DMZ_OPERATOR_COOKIE}=${encodeURIComponent(DMZ_DEFAULT_OPERATOR)}; Path=/; Max-Age=604800; SameSite=Lax`;
}

export type PipelineSelfTestBarProps = {
  threatId: string;
  threatTitle: string;
  threatStatus: string | null;
  likelihood?: number;
  impact?: number;
  ingestionDetails?: string | null;
  /** Override when embedded from ActiveRisksClient etc. */
  sourceComponentPath?: string;
  compact?: boolean;
  onAfterAction?: () => void;
};

export function PipelineSelfTestBar({
  threatId,
  threatTitle,
  threatStatus,
  likelihood = 8,
  impact = 9,
  ingestionDetails,
  sourceComponentPath = PIPELINE_COMPONENT,
  compact = false,
  onAfterAction,
}: PipelineSelfTestBarProps) {
  const router = useRouter();
  const { isSimulationMode: isShadow } = useSystemConfigStore();

  useLayoutEffect(() => {
    ensureDispositionOperatorCookie();
  }, []);
  const [diagOpen, setDiagOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptBody, setReceiptBody] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!isShadow) {
    return null;
  }

  const btn =
    "rounded border border-zinc-800/90 bg-zinc-950/90 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-zinc-500 transition-colors hover:border-zinc-500 hover:bg-zinc-900 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:text-zinc-500";

  const pass = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const res = await submitOperationalSelfTestPassAction({
          threatId,
          likelihood,
          impact,
          sourceComponentPath,
        });
        if (!res.success) {
          setError(res.error);
          return;
        }
        requestDashboardAuditRefresh();
        router.refresh();
        onAfterAction?.();
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
        setReceiptOpen(true);
      })();
    });
  };

  return (
    <div className={compact ? "mt-1" : "mt-2 border-t border-zinc-800/70 pt-2"}>
      <p className="mb-1.5 font-mono text-[8px] font-bold uppercase tracking-widest text-zinc-600">
        Operational self-test
      </p>
      <div className={`flex flex-wrap ${compact ? "gap-1" : "gap-1.5"}`}>
        <button type="button" disabled={pending} onClick={pass} className={btn}>
          System pass
        </button>
        <button
          type="button"
          disabled={pending}
          title="File structural deficiency report (Shadow Mode)"
          onClick={() => setDiagOpen(true)}
          className={btn}
        >
          System fail
        </button>
        <button type="button" disabled={pending} onClick={openReceipt} className={btn}>
          View system receipt
        </button>
      </div>
      {error ? <p className="mt-1 font-mono text-[9px] text-rose-400">{error}</p> : null}

      <DiagnosticReportModal
        open={diagOpen}
        onClose={() => setDiagOpen(false)}
        threatId={threatId}
        threatTitle={threatTitle}
        threatStatus={threatStatus ?? "—"}
        likelihood={likelihood}
        impact={impact}
        ingestionDetails={ingestionDetails}
        sourceComponentPath={sourceComponentPath}
        onSubmitted={() => {
          requestDashboardAuditRefresh();
          router.refresh();
          onAfterAction?.();
        }}
      />

      {receiptOpen && receiptBody ? (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="System receipt"
        >
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-zinc-700 bg-[#09090b]">
            <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
              <span className="font-mono text-[10px] font-black uppercase text-zinc-400">System receipt</span>
              <button
                type="button"
                className="rounded border border-zinc-700 px-2 py-1 font-mono text-[9px] uppercase text-zinc-400 hover:bg-zinc-900"
                onClick={() => {
                  setReceiptOpen(false);
                  setReceiptBody(null);
                }}
              >
                Close
              </button>
            </div>
            <pre className="max-h-[80vh] overflow-auto p-3 font-mono text-[10px] text-zinc-300">{receiptBody}</pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
