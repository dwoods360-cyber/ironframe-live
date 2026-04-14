"use client";

import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { Shield } from "lucide-react";
import {
  acknowledgeGrcInfrastructureLimitAndResetAgent,
  getManualRecoveryData,
  manualMitigationFourthAttempt,
  authorizeManualResolution,
  toggleRemoteAccessAuthorization,
  getRemoteAccessAdminEligibility,
  type ManualRecoveryPayload,
} from "@/app/actions/threatActions";
import { isGrcInfrastructureLimitMessage } from "@/app/utils/grcInfrastructureLimit";
import { dispatchRemoteSupportAction } from "@/app/actions/phoneHomeActions";
import { useRiskStore } from "@/app/store/riskStore";
import { useAgentStore } from "@/app/store/agentStore";
import { syncThreatBoardsClient } from "@/app/utils/syncThreatBoardsClient";
import {
  MANUAL_FIX_ATTEMPT4_TERMINAL_LINE,
  RECOVERY_ATTEMPT4_TERMINAL_LINE,
} from "@/app/utils/dmzIngressRealtime";

const DEFAULT_OPERATOR = "admin-user-01";

type RecoveryUiKind = "double-check" | "save";

function DoubleCheckSpinnerLabel() {
  return (
    <span className="flex items-center justify-center gap-2.5">
      <Shield className="h-4 w-4 shrink-0 animate-spin text-cyan-200" aria-hidden />
      <span className="font-black uppercase tracking-widest text-[10px] sm:text-[11px]">
        RETRYING FIX (Attempt 4)...
      </span>
    </span>
  );
}

function SaveSpinnerLabel() {
  return (
    <span className="flex items-center justify-center gap-2.5">
      <Shield className="h-4 w-4 shrink-0 animate-spin text-cyan-200" aria-hidden />
      <span className="font-black uppercase tracking-widest text-[10px] sm:text-[11px]">
        AGENT COMMUNICATING...
      </span>
    </span>
  );
}

type UiPhase = "recovery" | "remote_support";

type Props = {
  threatId: string | null;
  onClose: () => void;
  onResolved?: () => void;
};

/**
 * Desktop recovery: plain-English failure summary + recipe; after Attempt 4 fails → remote tech dispatch + access toggle.
 */
export default function ManualRecoveryOverlay({ threatId, onClose, onResolved }: Props) {
  const [data, setData] = useState<ManualRecoveryPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Blue-chip Double-Check: explicit loading flag (first line of handler must flip this). */
  const [isLoading, setIsLoading] = useState(false);
  /** Double-Check / Save: which primary action is running. */
  const [recoveryUiKind, setRecoveryUiKind] = useState<RecoveryUiKind | null>(null);
  const [uiPhase, setUiPhase] = useState<UiPhase>("recovery");
  const [remoteAccessAdminEligible, setRemoteAccessAdminEligible] = useState(false);

  const endRecoveryAttempt = useCallback(() => {
    flushSync(() => {
      setIsLoading(false);
      setRecoveryUiKind(null);
      setBusy(false);
      useRiskStore.getState().setRecoveryBoardSyncPending(false);
    });
  }, []);

  const runBoardSync = useCallback(async () => {
    const replacePipeline = useRiskStore.getState().replacePipelineThreats;
    const replaceActive = useRiskStore.getState().replaceActiveThreats;
    try {
      await syncThreatBoardsClient(replacePipeline, replaceActive);
    } catch {
      /* network — UI still refreshes via onResolved */
    }
  }, []);

  const load = useCallback(async () => {
    if (!threatId) {
      setData(null);
      return;
    }
    setErr(null);
    const r = await getManualRecoveryData(threatId);
    if ("error" in r) {
      setErr(r.error);
      setData(null);
      return;
    }
    setData(r);
    if (r.threatStatus === "PENDING_REMOTE_INTERVENTION") {
      setUiPhase("remote_support");
    } else {
      setUiPhase("recovery");
    }
  }, [threatId]);

  const handleDoubleCheck = useCallback(() => {
    if (!threatId) return;
    flushSync(() => {
      setIsLoading(true);
      setRecoveryUiKind("double-check");
      setBusy(true);
      useAgentStore.getState().appendRiskIngestionTerminalLine(MANUAL_FIX_ATTEMPT4_TERMINAL_LINE);
      useRiskStore.getState().setRecoveryBoardSyncPending(true);
    });

    void (async () => {
      setErr(null);
      try {
        const r = await manualMitigationFourthAttempt(threatId);
        if (r.success) {
          await runBoardSync();
          onResolved?.();
          onClose();
          return;
        }
        if (r.fourthAttemptFailed) {
          const d = await dispatchRemoteSupportAction(threatId);
          if (!d.success) {
            setErr(`${d.error} (Threat queued for remote support in-app.)`);
          }
          setUiPhase("remote_support");
          await load();
          await runBoardSync();
          onResolved?.();
          onClose();
          return;
        }
        setErr(r.error);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        endRecoveryAttempt();
      }
    })();
  }, [threatId, load, runBoardSync, onResolved, onClose, endRecoveryAttempt]);

  const handleSave = useCallback(() => {
    if (!threatId) return;
    flushSync(() => {
      setRecoveryUiKind("save");
      setBusy(true);
      useAgentStore.getState().appendRiskIngestionTerminalLine(RECOVERY_ATTEMPT4_TERMINAL_LINE);
      useRiskStore.getState().setRecoveryBoardSyncPending(true);
    });

    void (async () => {
      setErr(null);
      try {
        const r = await authorizeManualResolution(threatId, DEFAULT_OPERATOR);
        if (!r.success) {
          setErr(r.error);
          return;
        }
        await runBoardSync();
        onResolved?.();
        onClose();
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        endRecoveryAttempt();
      }
    })();
  }, [threatId, runBoardSync, onResolved, onClose, endRecoveryAttempt]);

  const handleAcknowledgeInfrastructure = useCallback(() => {
    if (!threatId) return;
    flushSync(() => setBusy(true));
    void (async () => {
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
        onResolved?.();
        onClose();
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    })();
  }, [threatId, runBoardSync, onResolved, onClose]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!threatId) setUiPhase("recovery");
  }, [threatId]);

  useEffect(() => {
    void getRemoteAccessAdminEligibility().then((r) => setRemoteAccessAdminEligible(r.eligible));
  }, []);

  if (!threatId) return null;

  const showRemoteTechCard =
    uiPhase === "remote_support" || data?.threatStatus === "PENDING_REMOTE_INTERVENTION";

  const infrastructureLimit =
    !showRemoteTechCard &&
    Boolean(
      data &&
        (data.infrastructureLimitDetected ||
          isGrcInfrastructureLimitMessage(
            data.failures.map((f) => f.error).join("\n"),
          )),
    );

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-recovery-title"
    >
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-rose-900/60 bg-slate-950 p-5 shadow-2xl">
        <h2 id="manual-recovery-title" className="text-sm font-black uppercase tracking-wider text-rose-100">
          Manual recovery
        </h2>
        <p className="mt-1 text-[11px] text-slate-400">
          Irontech exhausted automatic retries and sent Phone Home. Review the attempts below, then choose an
          action.
        </p>

        {err && (
          <p className="mt-3 text-[11px] text-amber-400" role="alert">
            {err}
          </p>
        )}

        {data && (
          <div className="mt-4 space-y-3 text-[11px] text-slate-200">
            <div>
              <p className="font-bold text-slate-300">{data.threatTitle}</p>
              <p className="mt-1 font-mono text-[10px] text-slate-500">{data.threatId}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">What happened</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-slate-300">
                {data.failures.length === 0 ? (
                  <li>Three mitigation attempts did not complete successfully (see diagnostics).</li>
                ) : (
                  data.failures.map((f, i) => (
                    <li key={`${f.at ?? i}-${f.attempt}`}>
                      Attempt {f.attempt}: {f.error.slice(0, 200)}
                      {f.error.length > 200 ? "…" : ""}
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="rounded-lg border border-blue-900/50 bg-blue-950/30 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-blue-300">
                Resolution recipe (Log-Dive / Ironintel context)
              </p>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-sans text-[10px] leading-relaxed text-slate-300">
                {data.recipeSummary}
              </pre>
            </div>
          </div>
        )}

        {showRemoteTechCard ? (
          <div className="mt-5 space-y-3">
            <div className="rounded-lg border border-cyan-900/45 bg-cyan-950/25 p-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-cyan-200/95">
                Live support feed
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-cyan-100/90">
                {data?.isRemoteAccessAuthorized
                  ? "Status: Tech is currently performing remote remediation."
                  : "Status: Tech is reviewing your Irontech Diagnostic Packet…"}
              </p>
              {data?.remoteTechId ? (
                <p className="mt-2 font-mono text-[10px] text-cyan-300/85">
                  Technician ID: {data.remoteTechId}
                </p>
              ) : null}
            </div>
            <div className="rounded-lg border border-amber-700/60 bg-amber-950/25 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-200">
              Tech dispatch
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-amber-100/95">
              Internal fixes exhausted. Requesting remote specialist…
            </p>
            <p className="mt-2 text-[10px] text-slate-500">
              {data?.threatStatus === "PENDING_REMOTE_INTERVENTION"
                ? "URGENT DISPATCH email was sent to the tech queue with full AgentOperation history. Remote access may be toggled below by an Admin/Owner only."
                : "Use “Resend dispatch email” once SMTP is configured. Authorize Remote Access requires Admin/Owner (or IRONFRAME_REMOTE_ACCESS_ADMIN_EMAILS)."}
            </p>
            <button
              type="button"
              disabled={busy || recoveryUiKind !== null || !remoteAccessAdminEligible}
              title={
                remoteAccessAdminEligible
                  ? undefined
                  : "Only Admin/Owner (or IRONFRAME_REMOTE_ACCESS_ADMIN_EMAILS) can authorize remote access."
              }
              onClick={() => {
                void (async () => {
                  if (!threatId) return;
                  setBusy(true);
                  setErr(null);
                  try {
                    const r = await toggleRemoteAccessAuthorization(threatId);
                    if (!r.success) {
                      setErr(r.error);
                      return;
                    }
                    await load();
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : String(e));
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
              className={`mt-4 w-full rounded-lg border px-3 py-2.5 text-left text-[11px] font-bold tracking-wide disabled:cursor-not-allowed disabled:opacity-40 ${
                data?.isRemoteAccessAuthorized
                  ? "border-emerald-600/80 bg-emerald-950/40 text-emerald-100 hover:bg-emerald-950/60"
                  : "border-amber-500/80 bg-amber-950/40 text-amber-100 hover:bg-amber-950/55"
              }`}
            >
              [🔓 Authorize Remote Access]
              {data?.isRemoteAccessAuthorized ? " — ON" : " — OFF"}
            </button>
            <button
              type="button"
              disabled={busy || recoveryUiKind !== null}
              onClick={() => {
                void (async () => {
                  if (!threatId) return;
                  setBusy(true);
                  setErr(null);
                  try {
                    const d = await dispatchRemoteSupportAction(threatId);
                    if (!d.success) {
                      setErr(d.error);
                      return;
                    }
                    await load();
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : String(e));
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
              className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              Resend dispatch email
            </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-2">
            {infrastructureLimit ? (
              <button
                type="button"
                disabled={busy}
                onClick={handleAcknowledgeInfrastructure}
                className="rounded-lg border border-amber-500 bg-amber-700 px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-amber-50 hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                [✅ Acknowledge & Reset Agent]
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={handleDoubleCheck}
                className="rounded-lg border border-blue-600 bg-blue-600 px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading && recoveryUiKind === "double-check" ? (
                  <DoubleCheckSpinnerLabel />
                ) : (
                  "[🛡️ Double-Check the Fix]"
                )}
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={handleSave}
              className="rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {recoveryUiKind === "save" ? (
                <SaveSpinnerLabel />
              ) : (
                "[✅ Save & Clean Up]"
              )}
            </button>
          </div>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="mt-4 text-[10px] font-bold uppercase text-slate-500 hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Close
        </button>
      </div>
    </div>
  );
}
