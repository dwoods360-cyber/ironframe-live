"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { purgeAllDataAction } from "@/app/actions/purgeSimulation";
import { useTenantContext } from "@/app/context/TenantProvider";
import { useAgentStore } from "@/app/store/agentStore";
import { appendAuditLog } from "@/app/utils/auditLogger";
import { applyMasterPurgeClientReset } from "@/app/utils/masterPurgeClient";
import { GRC_RESOLUTION_GATE_ADMIN_BYPASS_DETAIL } from "@/src/constants/grcManualPurge";

/**
 * Purge chip: tenant-scoped bulk-resolve on server; client boards empty immediately and
 * stay frozen empty briefly so sync/realtime cannot repopulate stale cards.
 */
export function PurgeBoardButton() {
  const router = useRouter();
  const { activeTenantUuid } = useTenantContext();
  const [purging, setPurging] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);

  return (
    <>
      <div className="shrink-0 text-right text-[10px] leading-tight text-[#ff4b4b] font-mono whitespace-nowrap">
        Master State Reset. ⚠️ DEV ONLY:
        <br />
        Do not deploy to Prod!
      </div>
      {purgeError ? (
        <p className="max-w-[14rem] text-right text-[9px] text-rose-300" role="alert">
          {purgeError}
        </p>
      ) : null}
      {showPurgeConfirm ? (
        <div className="flex items-center gap-2 rounded border border-slate-600 bg-slate-900/90 px-2 py-1">
          <span className="text-[10px] text-slate-300">Clear active board?</span>
          <button
            type="button"
            disabled={purging}
            onClick={async () => {
              if (purging) return;
              setPurging(true);
              setPurgeError(null);
              try {
                const tenantForPurge = activeTenantUuid?.trim() || null;
                const result = await purgeAllDataAction(tenantForPurge);
                if (!result.ok) {
                  setPurgeError(result.message || "Master purge failed.");
                  return;
                }
                applyMasterPurgeClientReset();
                router.refresh();
                const purgeLine =
                  "[ ☢️ PURGE ] | SYSTEM STATE RESET. ALL FORENSIC DATA CLEARED (DEV-ONLY ACTION).";
                appendAuditLog({
                  action_type: "SYSTEM_WARNING",
                  log_type: "GRC",
                  description: purgeLine,
                  metadata_tag: "GRC_PURGE|MASTER_STATE_RESET|DEV_ONLY",
                });
                useAgentStore.getState().addStreamMessage(purgeLine);
                useAgentStore.getState().addStreamMessage(
                  `> [GRC] ${GRC_RESOLUTION_GATE_ADMIN_BYPASS_DETAIL} — Bank Vault MANUAL_BOARD_PURGE recorded.`,
                );
                setShowPurgeConfirm(false);
              } catch (e) {
                setPurgeError(e instanceof Error ? e.message : String(e));
              } finally {
                setPurging(false);
              }
            }}
            className="rounded border border-rose-500/60 bg-rose-500/20 px-2 py-1 text-[10px] font-bold uppercase text-rose-300 hover:bg-rose-500/30 disabled:opacity-50"
          >
            {purging ? "…" : "Yes"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowPurgeConfirm(false);
              setPurgeError(null);
            }}
            disabled={purging}
            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-[10px] font-bold uppercase text-slate-300 hover:bg-slate-700"
          >
            No
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setPurgeError(null);
            setShowPurgeConfirm(true);
          }}
          disabled={purging}
          className="rounded border border-rose-500/60 bg-rose-500/10 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
        >
          Purge
        </button>
      )}
    </>
  );
}
