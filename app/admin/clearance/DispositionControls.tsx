"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  promoteThreatToSanctum,
  rejectAndArchiveThreat,
  escalateToSecOps,
} from "@/app/actions/clearanceActions";
import { requestDashboardAuditRefresh } from "@/app/utils/dashboardAuditRefresh";

type Props = {
  threatId: string;
};

export default function DispositionControls({ threatId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSuccess = () => {
    requestDashboardAuditRefresh();
    router.refresh();
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
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
          className="shrink-0 rounded border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wide text-zinc-200 hover:bg-black disabled:opacity-50"
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
          className="shrink-0 rounded border border-red-500/60 bg-transparent px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wide text-red-300 hover:bg-red-950/40 disabled:opacity-50"
        >
          {pending ? "…" : "Escalate SecOps"}
        </button>
      </div>
      {error ? (
        <span className="max-w-[260px] text-right text-[10px] text-rose-300">{error}</span>
      ) : null}
    </div>
  );
}
