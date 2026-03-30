"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Cpu, Skull } from "lucide-react";
import { injectChaosThreatAction } from "@/app/actions/chaosActions";
import { getIrontechActiveLogDive } from "@/app/actions/irontechUiActions";
import { useRiskStore } from "@/app/store/riskStore";
import { useAgentStore } from "@/app/store/agentStore";
import { syncThreatBoardsClient } from "@/app/utils/syncThreatBoardsClient";
import { IRONCHAOS_INGRESS_INITIATED_LINE } from "@/app/utils/dmzIngressRealtime";

/**
 * Irontech strip + active Ironchaos “Generate Chaos Threat” (full resilience + Phone Home drill).
 * Placed directly under the ATTBOT chip in Strategic Intel Control Room.
 */
export default function ControlRoom() {
  const [logDive, setLogDive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInjecting, setIsInjecting] = useState(false);
  const selectedThreatId = useRiskStore((s) => s.selectedThreatId);
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
    <div className="rounded-sm border border-zinc-800/80 bg-gradient-to-br from-zinc-950/90 to-zinc-950/80 p-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
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

      <button
        type="button"
        disabled={isInjecting}
        onClick={() => {
          flushSync(() => {
            setIsInjecting(true);
            setError(null);
            useAgentStore.getState().appendRiskIngestionTerminalLine(IRONCHAOS_INGRESS_INITIATED_LINE);
          });
          void (async () => {
            try {
              const r = await injectChaosThreatAction();
              if (!r.ok) {
                setError(r.error);
                return;
              }
              const newThreat = {
                id: r.threatId,
                name: "Poisoned Chaos Threat — Irontech resilience drill",
                loss: 0,
                score: 10,
                industry: "ChaosLab",
                source: "IRONCHAOS",
                description:
                  "IRONCHAOS: Controlled chaos ingress. Monitoring Irontech Retry-3 and Phone Home.",
                lifecycleState: "active" as const,
                createdAt: new Date().toISOString(),
                threatStatus: "ACTIVE",
                aiReport:
                  "IRONCHAOS: Controlled chaos ingress. Monitoring Irontech Retry-3 and Phone Home.",
                ingestionDetails: JSON.stringify({
                  isChaosTest: true,
                  optimisticLocalPush: true,
                }),
                isLocalOnly: true,
                localCreatedAt: new Date().toISOString(),
              };
              flushSync(() => {
                useAgentStore.getState().addActiveThreat(newThreat);
                const rs = useRiskStore.getState();
                rs.replaceActiveThreats([
                  newThreat,
                  ...rs.activeThreats.filter((t) => t.id !== newThreat.id),
                ]);
              });
              window.dispatchEvent(
                new CustomEvent("ironframe:tenant-company-allowlist", {
                  detail: { tenantCompanyId: r.tenantCompanyId },
                }),
              );
              await syncThreatBoardsClient();
            } finally {
              flushSync(() => setIsInjecting(false));
            }
          })();
        }}
        className="flex w-full min-w-0 items-center justify-center gap-2 rounded-sm border border-rose-600/90 bg-gradient-to-r from-rose-950/90 to-zinc-950/90 px-2 py-2 text-[9px] font-black uppercase tracking-widest text-rose-100 shadow-[0_0_12px_rgba(225,29,72,0.35)] animate-pulse hover:from-rose-900/95 hover:to-zinc-900/95 disabled:animate-none disabled:opacity-50"
      >
        <Skull className="h-3.5 w-3.5 shrink-0 text-rose-300" aria-hidden />
        {isInjecting ? "Deploying…" : "Generate Chaos Threat"}
      </button>
      <p className="mt-1.5 text-[7px] font-semibold uppercase leading-tight tracking-wide text-rose-500/75">
        Injects an active chaos threat; card appears immediately, then Retry-3 → Phone Home in the background
      </p>
      {error && (
        <p className="mt-1 text-[8px] text-amber-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
