"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Shield } from "lucide-react";
import {
  acknowledgeGrcInfrastructureLimitAndResetAgent,
  getManualRecoveryData,
  manualMitigationFourthAttempt,
  authorizeManualResolution,
  type ManualRecoveryPayload,
} from "@/app/actions/threatActions";
import { isGrcInfrastructureLimitMessage } from "@/app/utils/grcInfrastructureLimit";
import { dispatchRemoteSupportAction } from "@/app/actions/phoneHomeActions";
import { useRiskStore } from "@/app/store/riskStore";
import { useAgentStore } from "@/app/store/agentStore";
import { syncThreatBoardsClient } from "@/app/utils/syncThreatBoardsClient";
import { RECOVERY_ATTEMPT4_TERMINAL_LINE } from "@/app/utils/dmzIngressRealtime";

const DEFAULT_OPERATOR = "admin-user-01";

type RecoveryUiKind = "double-check" | "save";

function RecoveryCommunicatingLabel({ compact }: { compact?: boolean }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <Shield
        className={`shrink-0 animate-spin text-cyan-200 ${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`}
        aria-hidden
      />
      <span
        className={`font-black uppercase tracking-wider text-white ${compact ? "text-[8px]" : "text-[9px]"}`}
      >
        AGENT COMMUNICATING...
      </span>
    </span>
  );
}

type Props = {
  threatId: string;
  /** After successful action or dispatch — refresh store / parent. */
  onSynced?: () => void;
  /** Visual density for threat detail vs active card. */
  variant?: "card" | "detail";
  /** Attempt 4 in flight — parent can show ThreatCard “agent working” chrome. */
  onBusyChange?: (threatId: string, busy: boolean) => void;
  /** Latest recovery failure text — parent merges into infrastructure quota probe on ThreatCard. */
  onRecoveryErrorProbeChange?: (threatId: string, text: string | null) => void;
};

/**
 * Manual recovery lane (Main Ops card + detail): failures, recipe, Double-Check / Save & Clean Up.
 * When Attempt 4 fails, dispatches remote support; parent refresh swaps card to PENDING_REMOTE_INTERVENTION UI.
 */
export default function InlineManualRecoveryBlock({
  threatId,
  onSynced,
  variant = "card",
  onBusyChange,
  onRecoveryErrorProbeChange,
}: Props) {
  const [data, setData] = useState<ManualRecoveryPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recoveryUiKind, setRecoveryUiKind] = useState<RecoveryUiKind | null>(null);
  const [resolutionText, setResolutionText] = useState("");
  const lastProbeEmittedRef = useRef<string | null | undefined>(undefined);

  const beginRecoveryAttempt = useCallback(
    (kind: RecoveryUiKind) => {
      useAgentStore.getState().appendRiskIngestionTerminalLine(RECOVERY_ATTEMPT4_TERMINAL_LINE);
      useRiskStore.getState().setRecoveryBoardSyncPending(true);
      setRecoveryUiKind(kind);
      setBusy(true);
      onBusyChange?.(threatId, true);
    },
    [onBusyChange, threatId],
  );

  const endRecoveryAttempt = useCallback(() => {
    useRiskStore.getState().setRecoveryBoardSyncPending(false);
    setRecoveryUiKind(null);
    setBusy(false);
    onBusyChange?.(threatId, false);
  }, [onBusyChange, threatId]);

  const runBoardSync = useCallback(async () => {
    const replacePipeline = useRiskStore.getState().replacePipelineThreats;
    const replaceActive = useRiskStore.getState().replaceActiveThreats;
    try {
      await syncThreatBoardsClient(replacePipeline, replaceActive);
    } catch {
      /* non-fatal */
    }
  }, []);

  const load = useCallback(async () => {
    setErr(null);
    const r = await getManualRecoveryData(threatId);
    if ("error" in r) {
      setErr(r.error);
      setData(null);
      return;
    }
    setData(r);
  }, [threatId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const normalized =
      data == null
        ? null
        : (() => {
            const blob = data.failures.map((f) => f.error).join("\n");
            return blob.trim() === "" ? null : blob;
          })();
    if (lastProbeEmittedRef.current === normalized) return;
    lastProbeEmittedRef.current = normalized;
    onRecoveryErrorProbeChange?.(threatId, normalized);
  }, [data, threatId, onRecoveryErrorProbeChange]);

  useEffect(() => {
    return () => {
      onRecoveryErrorProbeChange?.(threatId, null);
    };
  }, [threatId, onRecoveryErrorProbeChange]);

  const pad = variant === "detail" ? "p-4" : "p-3";
  const titleCls =
    variant === "detail"
      ? "text-xs font-black uppercase tracking-wider text-rose-100"
      : "text-[10px] font-black uppercase tracking-wider text-rose-100";

  const infrastructureLimit = Boolean(
    data?.infrastructureLimitDetected ??
      (data
        ? isGrcInfrastructureLimitMessage(data.failures.map((f) => f.error).join("\n"))
        : false),
  );

  return (
    <div
      className={`pointer-events-auto z-30 mb-3 space-y-2 rounded-lg border border-rose-800/60 bg-rose-950/35 ${pad} shadow-inner shadow-rose-950/30`}
      onClick={(e) => e.stopPropagation()}
    >
      <p className={titleCls}>Manual recovery</p>
      <p className="text-[10px] text-rose-200/80">
        Irontech Phone Home — review attempts and apply a fix or close with audit justification.
      </p>

      {err && (
        <p className="text-[10px] text-amber-400" role="alert">
          {err}
        </p>
      )}

      {data && (
        <>
          <div className="rounded border border-slate-800/80 bg-slate-950/50 p-2">
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">What happened</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-[10px] text-slate-300">
              {data.failures.length === 0 ? (
                <li>Automatic mitigation attempts did not complete (see diagnostics).</li>
              ) : (
                data.failures.map((f, i) => (
                  <li key={`${f.at ?? i}-${f.attempt}`}>
                    Attempt {f.attempt}: {f.error.slice(0, 120)}
                    {f.error.length > 120 ? "…" : ""}
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="rounded border border-blue-900/40 bg-blue-950/25 p-2">
            <p className="text-[9px] font-bold uppercase tracking-wide text-blue-300/90">Resolution recipe</p>
            <p className="mt-1 line-clamp-4 text-[10px] leading-snug text-slate-300">{data.recipeSummary}</p>
          </div>
        </>
      )}

      <div className="flex flex-col gap-2 pt-1">
        {infrastructureLimit ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void (async () => {
                setBusy(true);
                setErr(null);
                try {
                  const r = await acknowledgeGrcInfrastructureLimitAndResetAgent(threatId);
                  if (!r.success) {
                    setErr(r.error);
                    return;
                  }
                  useAgentStore.getState().setAgentStatus("coreintel", "HEALTHY");
                  useAgentStore.getState().setAgentStatus("ironsight", "HEALTHY");
                  useAgentStore.getState().addStreamMessage(
                    "> [GRC] Infrastructure limit acknowledged — agents returned to idle.",
                  );
                  await runBoardSync();
                  onSynced?.();
                } catch (e) {
                  setErr(e instanceof Error ? e.message : String(e));
                } finally {
                  setBusy(false);
                }
              })();
            }}
            className="rounded-lg border border-amber-500 bg-amber-700 px-3 py-2 text-left text-[10px] font-bold tracking-wide text-amber-50 hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            [✅ Acknowledge & Reset Agent]
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void (async () => {
                beginRecoveryAttempt("double-check");
                setErr(null);
                try {
                  const r = await manualMitigationFourthAttempt(threatId);
                  if (r.success) {
                    await runBoardSync();
                    onSynced?.();
                    return;
                  }
                  if (r.fourthAttemptFailed) {
                    const d = await dispatchRemoteSupportAction(threatId);
                    if (!d.success) {
                      setErr(d.error);
                    }
                    await load();
                    await runBoardSync();
                    onSynced?.();
                    return;
                  }
                  setErr(r.error);
                } catch (e) {
                  setErr(e instanceof Error ? e.message : String(e));
                } finally {
                  endRecoveryAttempt();
                }
              })();
            }}
            className="rounded-lg border border-blue-600 bg-blue-600 px-3 py-2 text-left text-[10px] font-bold tracking-wide text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {recoveryUiKind === "double-check" ? (
              <RecoveryCommunicatingLabel compact />
            ) : (
              "[🛡️ Double-Check the Fix]"
            )}
          </button>
        )}
        <div className="space-y-1 rounded border border-amber-700/40 bg-amber-950/20 p-2">
          <label className="text-[9px] font-bold uppercase text-amber-200/90">
            Resolution justification (min 50 chars)
          </label>
          <textarea
            rows={variant === "detail" ? 3 : 2}
            value={resolutionText}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setResolutionText(e.target.value)}
            className="w-full rounded border border-amber-600/50 bg-slate-950 px-2 py-1 text-[10px] text-slate-100 outline-none focus:border-amber-500"
            placeholder="Closure rationale for audit…"
          />
          <span className="text-[9px] text-amber-200/60">{resolutionText.trim().length} / 50</span>
        </div>
        <button
          type="button"
          disabled={busy || resolutionText.trim().length < 50}
          onClick={() => {
            void (async () => {
              beginRecoveryAttempt("save");
              setErr(null);
              try {
                const r = await authorizeManualResolution(
                  threatId,
                  DEFAULT_OPERATOR,
                  resolutionText.trim(),
                );
                if (!r.success) {
                  setErr(r.error);
                  return;
                }
                setResolutionText("");
                await runBoardSync();
                onSynced?.();
              } catch (e) {
                setErr(e instanceof Error ? e.message : String(e));
              } finally {
                endRecoveryAttempt();
              }
            })();
          }}
          className="rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-2 text-left text-[10px] font-bold tracking-wide text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {recoveryUiKind === "save" ? (
            <RecoveryCommunicatingLabel compact />
          ) : (
            "[✅ Save & Clean Up]"
          )}
        </button>
      </div>
    </div>
  );
}
