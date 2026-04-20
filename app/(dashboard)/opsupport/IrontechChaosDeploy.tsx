"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Cpu, Skull } from "lucide-react";
import {
  applyChaosShadowDrillTelemetryStepAction,
  injectChaosThreatAction,
  type ChaosScenario,
} from "@/app/actions/chaosActions";
import { getIrontechActiveLogDive } from "@/app/actions/irontechUiActions";
import { getChaosShadowDrillStages } from "@/app/config/chaosScenarioTelemetry";
import { useRiskStore, type PipelineThreat } from "@/app/store/riskStore";
import { useAgentStore } from "@/app/store/agentStore";
import { IRONCHAOS_INGRESS_INITIATED_LINE } from "@/app/utils/dmzIngressRealtime";
import { fetchChaosLedgerClientAttribution } from "@/app/utils/chaosClientAttribution";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";

type Props = {
  embedded?: boolean;
};

/** 12s supervised loop: four beats (Ingestion → Analysis → Observation → Conclusion) with 4s gaps; then GRC ack. */
const CHAOS_FLIGHT_AUTO_ACK_JUSTIFICATION =
  "[IRONTECH CHAOS FLIGHT RECORDER] 12-second supervised telemetry complete: Irongate (14) → Irontech (11) → observation → SYSTEM conclusion; GRC acknowledge to Active Risks.";

function resolveDashboardTenantUuid(selectedTenantName: string | null): string {
  const n = (selectedTenantName ?? "").trim().toLowerCase();
  if (n === "vaultbank") return TENANT_UUIDS.vaultbank;
  if (n === "gridcore") return TENANT_UUIDS.gridcore;
  return TENANT_UUIDS.medshield;
}

const WAIT_MS = 4000;
const waitChaosTick = () => new Promise<void>((r) => setTimeout(r, WAIT_MS));

export default function IrontechChaosDeploy({ embedded = false }: Props) {
  const [logDive, setLogDive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInjecting, setIsInjecting] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<"" | ChaosScenario>("");
  const [selectedScenarioLabel, setSelectedScenarioLabel] = useState("");
  const selectedThreatId = useRiskStore((s) => s.selectedThreatId);
  const lastLogDiveFetchRef = useRef<{ at: number; threatId: string | null }>({
    at: 0,
    threatId: null,
  });

  useEffect(() => {
    if (embedded) return;
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
  }, [selectedThreatId, embedded]);

  const runInject = () => {
    if (selectedScenario === "") return;
    const scenario = selectedScenario;
    const scenarioLabelForServer = selectedScenarioLabel.trim();
    flushSync(() => {
      setIsInjecting(true);
      setError(null);
      useAgentStore.getState().appendRiskIngestionTerminalLine(IRONCHAOS_INGRESS_INITIATED_LINE);
    });

    void (async () => {
      try {
        const clientAttr = await fetchChaosLedgerClientAttribution();
        const res = await injectChaosThreatAction(
          scenario,
          clientAttr ?? undefined,
          scenarioLabelForServer.length > 0 ? scenarioLabelForServer : null,
          { skipIsolatedDrill: true },
        );
        if (!res.ok) {
          const attestationMsg = "Attestation Failed: Could not write to immutable ledger.";
          window.dispatchEvent(
            new CustomEvent("ironframe:chaos-drill-failed", {
              detail: { message: res.error?.trim() ? res.error : attestationMsg },
            }),
          );
          setError(res.error?.trim() ? res.error : attestationMsg);
          return;
        }

        const threatId = res.threatId;
        const store = useRiskStore.getState();
        store.upsertPipelineThreat(res.pipelineThreat as PipelineThreat);
        if (res.tenantCompanyId) {
          window.dispatchEvent(
            new CustomEvent("ironframe:tenant-company-allowlist", {
              detail: { tenantCompanyId: res.tenantCompanyId },
            }),
          );
        }

        const fail = (msg: string) => {
          setError(msg);
          store.setChaosFlightRecorder(threatId, null);
        };

        const patch = (ingestionDetails: string, assigneeId: string) => {
          store.updatePipelineThreat(threatId, { ingestionDetails, assigneeId });
        };

        const stages = getChaosShadowDrillStages(scenario);
        for (let i = 0; i < stages.length; i++) {
          if (i > 0) {
            await waitChaosTick();
          }
          const st = stages[i];
          store.setChaosFlightRecorder(threatId, {
            step: (i + 1) as 1 | 2 | 3 | 4,
            statusLine: st.flightStatusLine,
          });
          const stepRes = await applyChaosShadowDrillTelemetryStepAction(threatId, {
            terminalLine: st.terminalLine,
            terminalTone: st.terminalTone,
            phase: st.phase,
            assigneeId: st.assigneeId,
            assigneeLabel: st.assigneeLabel,
            directiveId: st.directiveId,
            recordObserverConcurrenceVerified: st.recordObserverConcurrenceVerified,
          });
          if (!stepRes.ok) {
            fail(stepRes.error ?? `Telemetry step ${i + 1} failed.`);
            return;
          }
          patch(stepRes.ingestionDetails, st.assigneeId);
        }

        store.setChaosFlightRecorder(threatId, null);

        const tenantId = resolveDashboardTenantUuid(store.selectedTenantName ?? null);
        const outcome = await store.acknowledgeThreat(
          threatId,
          "admin-user-01",
          CHAOS_FLIGHT_AUTO_ACK_JUSTIFICATION,
          tenantId,
        );

        if (!outcome.success) {
          setError(outcome.error ?? "Automated acknowledge failed.");
          return;
        }

        store.setChaosSelfHealedLine(threatId, "Status: Self-Healed & Resolved");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        flushSync(() => setIsInjecting(false));
      }
    })();
  };

  const controls = (
    <>
      <div className="mt-1 flex w-full flex-wrap items-stretch gap-2">
        <select
          aria-label="Chaos scenario"
          value={selectedScenario}
          onChange={(e) => {
            const v = e.target.value;
            const opt = e.target.selectedOptions[0];
            setSelectedScenario(v === "" ? "" : (v as ChaosScenario));
            setSelectedScenarioLabel(v === "" ? "" : (opt?.textContent ?? "").trim());
          }}
          disabled={isInjecting}
          className="h-8 min-w-[10rem] shrink-0 rounded-sm border border-cyan-700/60 bg-zinc-950 px-2 text-[9px] font-bold uppercase tracking-wide text-cyan-200 outline-none transition-colors hover:border-cyan-500/70 focus:border-cyan-400 disabled:opacity-60"
        >
          <option value="" disabled>
            SELECT CHAOS DRILL SCENARIO...
          </option>
          <option value="INTERNAL">1 - INTERNAL CHAOS DRILL (QUICK FIX)</option>
          <option value="HOME_SERVER">2 - HOME SERVER DRILL (REMOTE STRUGGLE)</option>
          <option value="CLOUD_EXFIL">3 - CLOUD EXFILTRATION (INTERNAL QUARANTINE)</option>
          <option value="REMOTE_SUPPORT">4 - REMOTE SUPPORT DRILL (HUMAN HANDOFF)</option>
          <option value="CASCADING_FAILURE">5 - CASCADING FAILURE (DOOMSDAY LOCKDOWN)</option>
        </select>
        <button
          type="button"
          disabled={isInjecting || selectedScenario === ""}
          onClick={runInject}
          className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-sm border border-fuchsia-500/85 bg-gradient-to-r from-fuchsia-950/95 via-fuchsia-950/80 to-zinc-950/95 px-2 py-2 text-[9px] font-black uppercase tracking-widest text-fuchsia-50 shadow-[0_0_14px_rgba(217,70,239,0.35)] transition-colors hover:from-fuchsia-900/95 hover:to-zinc-900/95 disabled:opacity-50"
        >
          <Skull className="h-3.5 w-3.5 shrink-0 text-fuchsia-200" aria-hidden />
          {isInjecting ? "Telemetry…" : "GENERATE CHAOS THREAT"}
        </button>
      </div>
      {error ? (
        <p className="mt-1 text-[8px] text-zinc-400" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );

  if (embedded) {
    return controls;
  }

  return (
    <div className="rounded-md border border-blue-900/50 bg-gradient-to-br from-slate-950/95 to-blue-950/40 p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
      <div className="mb-2 flex items-center justify-between gap-2 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <Cpu
            className={`h-3.5 w-3.5 shrink-0 text-cyan-400 ${logDive ? "irontech-log-dive" : "opacity-80"}`}
            aria-hidden
          />
          <span className="truncate text-[9px] font-black uppercase tracking-widest text-cyan-200/90">
            Irontech · Chaos drills (1–5)
          </span>
        </div>
        {logDive ? (
          <span className="text-[7px] font-semibold uppercase tracking-wide text-cyan-500/90">Log-dive</span>
        ) : null}
      </div>
      {controls}
    </div>
  );
}
