"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Cpu, Skull } from "lucide-react";
import {
  injectChaosThreatAction,
  type ChaosScenario,
} from "@/app/actions/chaosActions";
import { getIrontechActiveLogDive } from "@/app/actions/irontechUiActions";
import { useRiskStore } from "@/app/store/riskStore";
import { useAgentStore } from "@/app/store/agentStore";
import { useComplianceOverlayStore } from "@/app/store/complianceOverlayStore";
import { syncThreatBoardsClient } from "@/app/utils/syncThreatBoardsClient";
import { IRONCHAOS_INGRESS_INITIATED_LINE } from "@/app/utils/dmzIngressRealtime";
import { fetchChaosLedgerClientAttribution } from "@/app/utils/chaosClientAttribution";

/**
 * Irontech strip + active Ironchaos “Generate Chaos Threat” (five numbered resilience drills).
 * Placed directly under the ATTBOT chip in Strategic Intel Control Room.
 * Each inject calls `fetchChaosLedgerClientAttribution()` (Supabase user id/email + cookie fallback) so
 * `injectChaosThreatAction` records the operator in Integrity Hub “Authorized by”.
 */
export default function ControlRoom() {
  const [logDive, setLogDive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInjecting, setIsInjecting] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<"" | ChaosScenario>("");
  const selectedThreatId = useRiskStore((s) => s.selectedThreatId);
  const showCompliance = useComplianceOverlayStore((s) => s.showCompliance);
  const setShowCompliance = useComplianceOverlayStore((s) => s.setShowCompliance);
  const lastLogDiveFetchRef = useRef<{ at: number; threatId: string | null }>({
    at: 0,
    threatId: null,
  });

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      const now = Date.now();
      const tid = selectedThreatId ?? null;
      const last = lastLogDiveFetchRef.current;
      const threatChanged = tid !== last.threatId;
      const stale = now - last.at >= 5000;
      if (!threatChanged && !stale) return;
      lastLogDiveFetchRef.current = { at: now, threatId: tid };
      void getIrontechActiveLogDive().then((on) => {
        if (cancelled) return;
        setLogDive((prev) => (prev === on ? prev : on));
      });
    };
    tick();
    const id = setInterval(tick, 500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [selectedThreatId]);

  return (
    <div className="col-span-full rounded-sm border border-blue-900/50 bg-gradient-to-br from-slate-950/95 to-blue-950/40 p-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-zinc-800/60 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <Cpu
            className={`h-3.5 w-3.5 shrink-0 text-cyan-400 ${logDive ? "irontech-log-dive" : "opacity-80"}`}
            aria-hidden
          />
          <span className="truncate text-[9px] font-black uppercase tracking-widest text-cyan-200/90">
            Irontech
          </span>
        </div>
        {logDive && (
          <span className="text-[7px] font-semibold uppercase tracking-wide text-cyan-500/90">Log-dive</span>
        )}
      </div>

      <div className="mt-1 flex w-full flex-wrap items-stretch gap-2">
        <select
          aria-label="Chaos scenario"
          value={selectedScenario}
          onChange={(e) => {
            const v = e.target.value;
            setSelectedScenario(v === "" ? "" : (v as ChaosScenario));
          }}
          disabled={isInjecting}
          className="h-8 min-w-[10rem] shrink-0 rounded-sm border border-cyan-700/60 bg-zinc-950 px-2 text-[9px] font-bold uppercase tracking-wide text-cyan-200 outline-none transition-colors hover:border-cyan-500/70 focus:border-cyan-400 disabled:opacity-60"
        >
          <option value="" disabled>
            Select Chaos Drill Scenario...
          </option>
          <option value="INTERNAL">1 - Internal Chaos Drill (Quick Fix)</option>
          <option value="HOME_SERVER">2 - Home Server Drill (Remote Struggle)</option>
          <option value="CLOUD_EXFIL">3 - Cloud Exfiltration (Internal Quarantine)</option>
          <option value="REMOTE_SUPPORT">4 - Remote Support Drill (Human Handoff)</option>
          <option value="CASCADING_FAILURE">5 - Cascading Failure (Doomsday Lockdown)</option>
        </select>
        <button
          type="button"
          disabled={isInjecting || selectedScenario === ""}
          onClick={() => {
          if (selectedScenario === "") return;
          const scenario = selectedScenario;
          const optimisticId = `optimistic-chaos-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
          const optimisticThreat = {
            id: optimisticId,
            name:
              scenario === "INTERNAL"
                ? "Poisoned Chaos Threat — Internal Recovery Drill"
                : scenario === "HOME_SERVER"
                  ? "Poisoned Chaos Threat — Home Server Recovery Drill"
                  : scenario === "CLOUD_EXFIL"
                    ? "Poisoned Chaos Threat — Cloud Exfil / Ironlock Drill"
                    : scenario === "REMOTE_SUPPORT"
                      ? "Poisoned Chaos Threat — Remote Support Drill"
                      : "Poisoned Chaos Threat — Cascading Failure Drill",
            loss: 0,
            score: 10,
            industry: "ChaosLab",
            source: "IRONCHAOS",
            description:
              "IRONCHAOS: Controlled chaos ingress. Monitoring Irontech Retry-3 and Phone Home.",
            lifecycleState: "active" as const,
            createdAt: new Date().toISOString(),
            threatStatus: "ACTIVE",
            ingestionDetails: JSON.stringify({
              isChaosTest: true,
              chaosScenario: scenario,
              optimisticLocalPush: true,
            }),
            isLocalOnly: true,
            localCreatedAt: new Date().toISOString(),
          };
          flushSync(() => {
            setIsInjecting(true);
            setError(null);
            useAgentStore.getState().appendRiskIngestionTerminalLine(IRONCHAOS_INGRESS_INITIATED_LINE);
          });
          window.dispatchEvent(
            new CustomEvent("ironframe:chaos-drill-optimistic-start", {
              detail: { threat: optimisticThreat, processingMs: 3000 },
            }),
          );
          void (async () => {
            try {
              const clientAttr = await fetchChaosLedgerClientAttribution();
              const res = await injectChaosThreatAction(scenario, clientAttr ?? undefined);
              if (!res.ok) {
                const attestationMsg =
                  "Attestation Failed: Could not write to immutable ledger.";
                window.dispatchEvent(
                  new CustomEvent("ironframe:chaos-drill-failed", {
                    detail: {
                      message: res.error?.trim() ? res.error : attestationMsg,
                    },
                  }),
                );
                setError(res.error?.trim() ? res.error : attestationMsg);
                window.dispatchEvent(
                  new CustomEvent("ironframe:chaos-drill-optimistic-failed", {
                    detail: { optimisticId },
                  }),
                );
                return;
              }
              window.dispatchEvent(
                new CustomEvent("ironframe:chaos-drill-optimistic-success", {
                  detail: { optimisticId, threatId: res.threatId },
                }),
              );
              if (res.tenantCompanyId) {
                window.dispatchEvent(
                  new CustomEvent("ironframe:tenant-company-allowlist", {
                    detail: { tenantCompanyId: res.tenantCompanyId },
                  }),
                );
              }
              await syncThreatBoardsClient();
            } finally {
              flushSync(() => setIsInjecting(false));
            }
          })();
        }}
          className="flex flex-1 min-w-0 items-center justify-center gap-2 rounded-sm border border-rose-600/90 bg-gradient-to-r from-rose-950/90 to-zinc-950/90 px-2 py-2 text-[9px] font-black uppercase tracking-widest text-rose-100 shadow-[0_0_12px_rgba(225,29,72,0.35)] animate-pulse hover:from-rose-900/95 hover:to-zinc-900/95 disabled:animate-none disabled:opacity-50"
        >
          <Skull className="h-3.5 w-3.5 shrink-0 text-rose-300" aria-hidden />
          {isInjecting ? "Deploying…" : "Generate Chaos Threat"}
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={showCompliance}
          aria-label="Compliance overlay"
          onClick={() => setShowCompliance(!showCompliance)}
          className={`flex h-8 shrink-0 items-center gap-2 rounded-sm border px-2.5 text-[8px] font-black uppercase tracking-widest transition-all ${
            showCompliance
              ? "border-teal-400/70 bg-teal-950/45 text-teal-100 shadow-[inset_0_1px_0_0_rgba(45,212,191,0.15),0_0_14px_rgba(45,212,191,0.12)]"
              : "border-zinc-700/90 bg-zinc-950 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400"
          }`}
        >
          <span
            className={`h-2 w-5 rounded-full transition-colors ${
              showCompliance ? "bg-teal-400 shadow-[0_0_8px_#2dd4bf]" : "bg-zinc-700"
            }`}
            aria-hidden
          />
          <span className="whitespace-nowrap">🛡️ COMPLIANCE OVERLAY</span>
        </button>
      </div>
      <p className="mt-1.5 text-[7px] font-semibold uppercase leading-tight tracking-wide text-rose-500/75">
        Injects an active chaos threat; pick scenarios 1–5 to match the Irontech resilience timelines
      </p>
      {error && (
        <p className="mt-1 text-[8px] text-amber-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
