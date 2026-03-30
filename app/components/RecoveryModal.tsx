"use client";

import { useState } from "react";
import Link from "next/link";
import { Archive, PlayCircle, RefreshCw } from "lucide-react";
import { AgentOperationStatus } from "@prisma/client";
import { useAgentStore } from "@/app/store/agentStore";
import {
  recoveryArchiveResolveAction,
  recoveryResumeOperationsAction,
  recoveryValidationScanAction,
} from "@/app/actions/irontechRecoveryActions";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  threatId: string;
  /** When `EXTERNALLY_RESOLVED`, show GRC-approved recovery actions. */
  operationStatus: AgentOperationStatus | null;
  /** Defaults to Ironsight for resume heartbeat. */
  agentName?: string;
  onCompleted?: () => void;
};

/**
 * Irontech recovery UI: actions available when an operation was resolved outside the retry loop.
 */
export default function RecoveryModal({
  isOpen,
  onClose,
  threatId,
  operationStatus,
  agentName = "Ironsight",
  onCompleted,
}: Props) {
  const setAgentStatus = useAgentStore((s) => s.setAgentStatus);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const showActions = operationStatus === AgentOperationStatus.EXTERNALLY_RESOLVED;

  const handleArchive = async () => {
    setBusy(true);
    setMessage(null);
    const r = await recoveryArchiveResolveAction(threatId, agentName);
    setBusy(false);
    if (r.success) {
      setMessage("Archived and audit logged.");
      onCompleted?.();
      onClose();
    } else {
      setMessage(r.error);
    }
  };

  const handleScan = async () => {
    setBusy(true);
    setMessage(null);
    const r = await recoveryValidationScanAction(threatId);
    setBusy(false);
    if (r.success) {
      setMessage("Validation scan completed.");
      onCompleted?.();
    } else {
      setMessage(r.error);
    }
  };

  const handleResume = async () => {
    setBusy(true);
    setMessage(null);
    const r = await recoveryResumeOperationsAction(threatId, agentName);
    setBusy(false);
    if (r.success) {
      setAgentStatus("ironsight", "HEALTHY");
      setMessage("Operations resumed; Ironsight heartbeat restored.");
      onCompleted?.();
      onClose();
    } else {
      setMessage(r.error);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-950 p-5 shadow-2xl">
        <h2 id="recovery-modal-title" className="text-sm font-black uppercase tracking-wider text-slate-100">
          Irontech Recovery
        </h2>
        <p className="mt-1 text-[11px] text-slate-400">
          Threat <span className="font-mono text-slate-300">{threatId}</span> ·{" "}
          <span className="text-amber-400/90">System Pulse</span> (agent health) vs{" "}
          <span className="text-emerald-400/90">CSRD outcomes</span> (sustainability ledger).
        </p>

        {!showActions ? (
          <div
            className="mt-4 rounded-lg border border-sky-500/25 bg-sky-950/25 px-3 py-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
            role="status"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-sky-200/95">
              Required action
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-300">
              These shortcuts stay locked until someone marks this threat as{" "}
              <span className="font-medium text-slate-200">fixed outside the automated retry flow</span>{" "}
              (for example your vendor or SOC). Then you can double-check the fix, wrap up records, or
              return to normal monitoring—right from here.
            </p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={handleScan}
              title="This asks the system to make sure the external fix is actually working."
              className="flex items-center justify-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4 shrink-0" aria-hidden />
              <span>[🛡️ Double-Check the Fix]</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleArchive}
              title="Saves the outcome to your audit trail and clears this item from the active recovery queue."
              className="flex items-center justify-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
            >
              <Archive className="h-4 w-4 shrink-0" aria-hidden />
              <span>[✅ Save &amp; Clean Up]</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleResume}
              title="Turns automated monitoring back on so routine operations continue as usual."
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-500 bg-transparent px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-slate-100 hover:border-slate-400 hover:bg-slate-800/60 disabled:opacity-50"
            >
              <PlayCircle className="h-4 w-4 shrink-0" aria-hidden />
              <span>[🚀 Back to Normal]</span>
            </button>
          </div>
        )}

        {message && (
          <p className="mt-3 text-[10px] text-slate-400" role="status">
            {message}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
          <Link
            href={`/threats/${threatId}`}
            className="text-[10px] font-semibold uppercase text-blue-400 hover:text-blue-300"
          >
            Open threat
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="text-[10px] font-bold uppercase text-slate-500 hover:text-slate-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
