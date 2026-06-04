"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import { Cpu, Skull } from "lucide-react";
import {
  applyChaosShadowDrillTelemetryStepAction,
  executeChaosDrillIrontechLifecycleStepAction,
  injectChaosThreatAction,
  runRemoteSupportChaosDrillAction,
  type ChaosScenario,
} from "@/app/actions/chaosActions";
import { listRiskRegistryRecordsAction } from "@/app/actions/riskLifecycleActions";
import { REMOTE_SUPPORT_ATTACK_VELOCITY_MS } from "@/app/utils/chaosDiscoveryHold";
import { useRiskRegistryStore } from "@/app/store/riskRegistryStore";
import { getIrontechActiveLogDive } from "@/app/actions/irontechUiActions";
import { getChaosShadowDrillStages } from "@/app/config/chaosScenarioTelemetry";
import { useRiskStore, type PipelineThreat } from "@/app/store/riskStore";
import { useAgentStore } from "@/app/store/agentStore";
import { IRONCHAOS_INGRESS_INITIATED_LINE } from "@/app/utils/dmzIngressRealtime";
import { fetchChaosLedgerClientAttribution } from "@/app/utils/chaosClientAttribution";
import { useAdversarySimulatorStore } from "@/app/store/adversarySimulatorStore";
import { appendAuditLog } from "@/app/utils/auditLogger";
import { syncShadowSimulatorArmAction } from "@/app/actions/shadowSimulatorArmActions";
import { applyManualSimulationStandDownResumeFeed } from "@/app/utils/manualSimulationStandDownFeed";
import { requestVictoryLapFromNeutralize } from "@/app/utils/activeThreatLifecycleBridge";
import { markRegistryResolvedForThreatEvent } from "@/app/utils/riskRegistryResolvedPurge";
import { syncThreatBoardsClient } from "@/app/utils/syncThreatBoardsClient";
import { useTenantContext } from "@/app/context/TenantProvider";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import { useSystemConfigStore } from "@/app/store/systemConfigStore";
import ChaosConstitutionalCollapsePanel from "@/app/components/ChaosConstitutionalCollapsePanel";
import {
  IRONTECH_CHAOS_LEVEL_DRILLS,
  IRONTECH_CHAOS_L6_ACTION_TOKEN,
  IRONTECH_CHAOS_LEVEL_6_DRILL,
  isIrontechChaosLevelScenario,
} from "@/app/config/irontechChaosDrillOptions";
import { runIrontechChaosL6MockDrill } from "@/app/lib/irontechChaosL6Drill";
import { isConstitutionalChaosDrill } from "@/app/config/chaosRegistry";
import ContextualHelpTrigger from "@/app/components/HelpSystem/ContextualHelpTrigger";

type ChaosDeployScenario = ChaosScenario | "CONSTITUTIONAL_COLLAPSE" | typeof IRONTECH_CHAOS_L6_ACTION_TOKEN;

/**
 * Dropdown copy uses **Infil:** / **Phish:** prefixes; each `<option value>` is the `ChaosScenario` enum passed to
 * `injectChaosThreatAction` (authoritative for `PHISHBOT_SIMULATION` / `INFILBOT_SIMULATION` and `/integrity` refresh).
 */
function isChaosInfilScenario(s: ChaosScenario): boolean {
  return s === "INFIL_CRED_STUFFING" || s === "INFIL_LATERAL_PIVOT";
}

function isChaosPhishScenario(s: ChaosScenario): boolean {
  return s === "PHISH_CEO_FRAUD" || s === "PHISH_IT_HELPDESK";
}

type Props = {
  embedded?: boolean;
};

/** 12s supervised loop: four beats (Ingestion → Analysis → Observation → Conclusion) with 4s gaps; then GRC ack. */
const CHAOS_FLIGHT_AUTO_ACK_JUSTIFICATION =
  "[IRONTECH CHAOS FLIGHT RECORDER] 12-second supervised telemetry complete: Irongate (14) → Ironscribe (5) → Irontech (11) → System/Observer; GRC acknowledge to Active Risks.";

const WAIT_MS = 4000;
/** Matches `CHAOS_DRILL_LIFECYCLE_GATE_DELAY_MS` in chaosActions (Irontech gates 2–4). */
const LIFECYCLE_GATE_WAIT_MS = 5000;
const waitChaosTick = () => new Promise<void>((r) => setTimeout(r, WAIT_MS));
const waitLifecycleGate = () => new Promise<void>((r) => setTimeout(r, LIFECYCLE_GATE_WAIT_MS));

function pushChaosThreatToActiveBoard(threatId: string, patch: Partial<PipelineThreat>) {
  const store = useRiskStore.getState();
  const snap =
    store.activeThreats.find((t) => t.id === threatId) ??
    store.pipelineThreats.find((t) => t.id === threatId);
  if (!snap) return;
  const row: PipelineThreat = {
    ...snap,
    ...patch,
    lifecycleState: "active",
  };
  store.updatePipelineThreat(threatId, patch);
  store.upsertActiveThreat(row);
}

function parseIngestionEntityType(raw: string | null | undefined): string | null {
  try {
    const j = JSON.parse(raw ?? "{}") as { entityType?: unknown };
    return typeof j.entityType === "string" ? j.entityType : null;
  } catch {
    return null;
  }
}

export default function IrontechChaosDeploy({ embedded = false }: Props) {
  const router = useRouter();
  const { activeTenantUuid, tenantFetch } = useTenantContext();
  const [collapseArmed, setCollapseArmed] = useState(false);
  const { isSimulationMode } = useSystemConfigStore();
  const [logDive, setLogDive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInjecting, setIsInjecting] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<"" | ChaosDeployScenario>("");
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
      const setInfiltrActive = useAdversarySimulatorStore.getState().setInfiltrActive;
      const setPhishActive = useAdversarySimulatorStore.getState().setPhishActive;
      const syncArm = async () => {
        try {
          const snap = await syncShadowSimulatorArmAction();
          setInfiltrActive(snap.infiltrBotSimActive);
          setPhishActive(snap.phishBotSimActive);
        } catch {
          /* ignore */
        }
      };

      try {
        if (scenario === IRONTECH_CHAOS_L6_ACTION_TOKEN) {
          await runIrontechChaosL6MockDrill();
          return;
        }

        const clientAttr = await fetchChaosLedgerClientAttribution();
        const tenantForChaos =
          activeTenantUuid?.trim() ||
          (isSimulationMode ? TENANT_UUIDS.medshield : "");
        if (!tenantForChaos) {
          setError("No active tenant in session. Chaos inject blocked.");
          return;
        }

        if (isConstitutionalChaosDrill(scenario)) {
          const triggerRes = await tenantFetch("/api/chaos/trigger", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scenario: "CONSTITUTIONAL_COLLAPSE",
              tenantId: tenantForChaos,
            }),
          });
          const triggerJson = (await triggerRes.json().catch(() => ({}))) as {
            ok?: boolean;
            error?: string;
          };
          if (!triggerRes.ok || !triggerJson.ok) {
            setError(triggerJson.error ?? "Constitutional collapse trigger failed.");
            return;
          }
          setCollapseArmed(true);
          useRiskStore.getState().setConstitutionalIntegrityState({
            isConstitutionalEmergency: true,
            constitutionalRebaselinePending: false,
            constitutionalDegradedMode: false,
            requiredForensicAttestationMin: 100,
            isOverrideSpent: false,
            sha256: null,
            sha256Short: "",
            failureReason: "INVALID_HASH",
            failureMessage: "[SIMULATION_DATA] Constitutional collapse chaos drill.",
          });
          appendAuditLog({
            action_type: "CHAOS_CONSTITUTIONAL_COLLAPSE",
            log_type: "SIMULATION",
            description: `[SIMULATION_DATA] Constitutional collapse armed for tenant ${tenantForChaos.slice(0, 8)}…`,
            metadata_tag: "SIMULATION|CONSTITUTIONAL_COLLAPSE",
          });
          window.dispatchEvent(new CustomEvent("ironframe:dashboard-refetch"));
          return;
        }

        const isRemoteSupportL4 = scenario === "REMOTE_SUPPORT";

        const res = await injectChaosThreatAction(
          scenario as ChaosScenario,
          clientAttr ?? undefined,
          scenarioLabelForServer.length > 0 ? scenarioLabelForServer : null,
          {
            /** L4: registry + Attack Velocity first; drill via `runRemoteSupportChaosDrillAction` after 1s. */
            deferRemoteSupportDrill: isRemoteSupportL4,
            skipIsolatedDrill: true,
            tenantUuidOverride: tenantForChaos,
          },
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

        applyManualSimulationStandDownResumeFeed();

        const chaosScenario =
          scenario === "CONSTITUTIONAL_COLLAPSE" ? null : (scenario as ChaosScenario);

        if (chaosScenario && isChaosInfilScenario(chaosScenario)) {
          setInfiltrActive(true);
          appendAuditLog({
            action_type: "RED_TEAM_SIMULATION_START",
            log_type: "SIMULATION",
            description: `Chaos drill armed (09 — InfilBot): ${scenarioLabelForServer || scenario}.`,
            metadata_tag: `SIMULATION|INFILBOT_CHAOS|${scenario}`,
          });
        } else if (chaosScenario && isChaosPhishScenario(chaosScenario)) {
          setPhishActive(true);
          appendAuditLog({
            action_type: "RED_TEAM_SIMULATION_START",
            log_type: "SIMULATION",
            description: `Chaos drill armed (10 — PhishBot): ${scenarioLabelForServer || scenario}.`,
            metadata_tag: `SIMULATION|PHISHBOT_CHAOS|${scenario}`,
          });
        }

        const threatId = res.threatId;
        const store = useRiskStore.getState();
        const injectedRow = res.pipelineThreat as PipelineThreat;

        if (isRemoteSupportL4) {
          const pipelineRow: PipelineThreat = {
            ...injectedRow,
            threatStatus: "IDENTIFIED",
            lifecycleState: "pipeline",
            industry: injectedRow.industry ?? "ChaosLab",
          };
          store.upsertPipelineThreat(pipelineRow);
          const activeIds = new Set(store.activeThreats.map((t) => t.id));
          if (activeIds.has(threatId)) {
            store.replaceActiveThreats(store.activeThreats.filter((t) => t.id !== threatId));
          }
          void listRiskRegistryRecordsAction().then((reg) => {
            if (reg.ok) useRiskRegistryStore.getState().hydrate(reg.records);
          });
          if (res.tenantCompanyId) {
            window.dispatchEvent(
              new CustomEvent("ironframe:tenant-company-allowlist", {
                detail: { tenantCompanyId: res.tenantCompanyId },
              }),
            );
          }
          await new Promise<void>((r) => setTimeout(r, REMOTE_SUPPORT_ATTACK_VELOCITY_MS));

          const drillRes = await runRemoteSupportChaosDrillAction(threatId, clientAttr ?? undefined);
          if (!drillRes.ok) {
            setError(drillRes.error?.trim() ? drillRes.error : "Remote Support drill failed.");
            return;
          }

          pushChaosThreatToActiveBoard(threatId, {
            threatStatus: "MITIGATED",
            lifecycleState: "active",
          });
          store.setChaosFlightRecorder(threatId, null);
          store.removeThreatFromPipeline(threatId);
          await store.refreshActiveThreatsFromDb().catch(() => undefined);
          void useRiskStore.getState().pulseThreatBoardsFromDb().catch(() => undefined);
          store.setChaosSelfHealedLine(
            threatId,
            "Awaiting Tier-3 Remote Support — use GRANT 2-HOUR ACCESS on the Active Risks card.",
          );
          window.dispatchEvent(new CustomEvent("ironframe:dashboard-refetch"));
          void tenantFetch("/api/dashboard", { cache: "no-store" }).catch(() => undefined);
          router.refresh();
          return;
        }

        store.upsertPipelineThreat(injectedRow);
        pushChaosThreatToActiveBoard(threatId, {
          threatStatus: injectedRow.threatStatus ?? "IDENTIFIED",
        });
        await store.refreshActiveThreatsFromDb().catch(() => undefined);
        if (res.tenantCompanyId) {
          window.dispatchEvent(
            new CustomEvent("ironframe:tenant-company-allowlist", {
              detail: { tenantCompanyId: res.tenantCompanyId },
            }),
          );
        }
        window.dispatchEvent(new CustomEvent("ironframe:dashboard-refetch"));
        void tenantFetch("/api/dashboard", { cache: "no-store" }).catch(() => undefined);
        void useRiskStore.getState().pulseThreatBoardsFromDb().catch(() => undefined);

        const fail = (msg: string) => {
          setError(msg);
          store.setChaosFlightRecorder(threatId, null);
        };

        const patch = (ingestionDetails: string, assigneeId: string | null) => {
          store.updatePipelineThreat(threatId, {
            ingestionDetails,
            assigneeId: assigneeId ?? undefined,
          });
        };

        const stages = chaosScenario ? getChaosShadowDrillStages(chaosScenario) : [];
        let forensicGavelStruck = false;
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
          const boardAssignee =
            st.phase === "T12_RESOLUTION_SYSTEM" ? null : st.assigneeId;
          patch(stepRes.ingestionDetails, boardAssignee);
          if (stepRes.gavelStruck) {
            forensicGavelStruck = true;
            markRegistryResolvedForThreatEvent(threatId, stepRes.resolvedAt);
            pushChaosThreatToActiveBoard(threatId, {
              threatStatus: "RESOLVED",
              assigneeId: undefined,
              ingestionDetails: stepRes.ingestionDetails,
            });
            requestVictoryLapFromNeutralize(threatId);
            window.dispatchEvent(new CustomEvent("ironframe:dashboard-refetch"));
            void tenantFetch("/api/dashboard", { cache: "no-store" }).catch(() => undefined);
          } else {
            window.dispatchEvent(new CustomEvent("ironframe:dashboard-refetch"));
            void tenantFetch("/api/dashboard", { cache: "no-store" }).catch(() => undefined);
            void useRiskStore.getState().refreshActiveThreatsFromDb().catch(() => undefined);
          }
        }

        store.setChaosFlightRecorder(threatId, null);

        const pipelineSnap = useRiskStore.getState().pipelineThreats.find((t) => t.id === threatId);
        const chaosEntityType = parseIngestionEntityType(pipelineSnap?.ingestionDetails);
        const useIrontechChaosDrillLifecycle =
          isIrontechChaosLevelScenario(scenario) && chaosEntityType === "CHAOS_DRILL";

        if (useIrontechChaosDrillLifecycle && !forensicGavelStruck) {
          const lifecycleStatusByGate: Record<1 | 2 | 3 | 4, string | undefined> = {
            1: "IDENTIFIED",
            2: "CONFIRMED",
            3: "MITIGATED",
            4: "RESOLVED",
          };
          for (let gate = 1; gate <= 4; gate++) {
            if (gate > 1) {
              await waitLifecycleGate();
            }
            const step = gate as 1 | 2 | 3 | 4;
            const lr = await executeChaosDrillIrontechLifecycleStepAction(threatId, step);
            if (!lr.ok) {
              fail(lr.error ?? `Irontech chaos drill lifecycle gate ${gate} failed.`);
              return;
            }
            const status = lifecycleStatusByGate[step];
            if (status) {
              pushChaosThreatToActiveBoard(threatId, {
                threatStatus: status,
                ...(gate === 4 ? { assigneeId: undefined } : {}),
              });
            }
            window.dispatchEvent(new CustomEvent("ironframe:dashboard-refetch"));
            await store.refreshActiveThreatsFromDb().catch(() => undefined);
          }
          requestVictoryLapFromNeutralize(threatId);
          router.refresh();
        } else if (forensicGavelStruck) {
          router.refresh();
        } else {
          const tenantId = tenantForChaos;
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
        }

        store.setChaosSelfHealedLine(threatId, "Status: Self-Healed & Resolved");

        if (!useIrontechChaosDrillLifecycle) {
          await syncThreatBoardsClient(
            useRiskStore.getState().replacePipelineThreats,
            useRiskStore.getState().replaceActiveThreats,
          ).catch(() => undefined);
          void useRiskStore.getState().refreshActiveThreatsFromDb().catch(() => undefined);
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        flushSync(() => setIsInjecting(false));
        await syncArm();
      }
    })();
  };

  const controls = (
    <>
      <div className="mt-1 flex w-full flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-[8px] font-bold uppercase tracking-widest text-cyan-500/90">
            Chaos drill scenario
          </label>
          <ContextualHelpTrigger
            featureId="sim-001"
            title="Live Simulation Scenarios (Chaos Drills)"
            location="Positioned in the middle section of the left-hand column panel."
            purpose="Injects mock infrastructure threats like ransomware outbreaks to test background automation recovery."
            steps={[
              "Click the dropdown menu containing available simulation threats.",
              "Select an item like 'Ransomware Outbreak Mock Sync'.",
              "Click 'Generate Chaos Threat' and watch the logs track the automatic background interception.",
            ]}
          />
        </div>
        <select
          value={selectedScenario}
          disabled={isInjecting}
          data-audit-target="Chaos Drill Dropdown Expanded"
          data-audit-section="Chaos Engineering Simulation Injector"
          onChange={(e) => {
            const v = e.target.value;
            const opt = e.target.selectedOptions[0];
            setSelectedScenario(v === "" ? "" : (v as ChaosDeployScenario));
            setSelectedScenarioLabel(v === "" ? "" : (opt?.textContent ?? "").trim());
          }}
          className="w-full rounded-sm border border-cyan-800/60 bg-zinc-950/95 px-2 py-2 text-[9px] font-semibold uppercase tracking-wide text-cyan-50 outline-none focus:border-cyan-500/80 disabled:opacity-50"
        >
          <option value="" disabled>
            Select Irontech Chaos drill…
          </option>
          <optgroup label="Irontech Chaos Levels 1–6">
            {IRONTECH_CHAOS_LEVEL_DRILLS.map((d) => (
              <option key={d.scenario} value={d.scenario}>
                {d.label}
              </option>
            ))}
            <option value={IRONTECH_CHAOS_L6_ACTION_TOKEN}>{IRONTECH_CHAOS_LEVEL_6_DRILL.label}</option>
          </optgroup>
          <optgroup label="Adversary simulations">
            <option value="INFIL_CRED_STUFFING">Infil: Shadow Credential Stuffing</option>
            <option value="INFIL_LATERAL_PIVOT">Infil: Lateral Pivot Attempt</option>
            <option value="PHISH_CEO_FRAUD">Phish: CEO Fraud (Urgent Wire)</option>
            <option value="PHISH_IT_HELPDESK">Phish: IT Helpdesk Trap</option>
          </optgroup>
          <optgroup label="Constitutional">
            <option value="CONSTITUTIONAL_COLLAPSE">
              Constitutional Collapse (TAS Void + DMS · 240s)
            </option>
          </optgroup>
        </select>
        <button
          type="button"
          disabled={isInjecting || selectedScenario === ""}
          onClick={runInject}
          className="flex w-full items-center justify-center gap-2 rounded-sm border border-fuchsia-500/85 bg-gradient-to-r from-fuchsia-950/95 via-fuchsia-950/80 to-zinc-950/95 px-2 py-2 text-[9px] font-black uppercase tracking-widest text-fuchsia-50 shadow-[0_0_14px_rgba(217,70,239,0.35)] transition-colors hover:from-fuchsia-900/95 hover:to-zinc-900/95 disabled:opacity-50"
        >
          <Skull className="h-3.5 w-3.5 shrink-0 text-fuchsia-200" aria-hidden />
          {isInjecting
            ? "Telemetry…"
            : isConstitutionalChaosDrill(selectedScenario)
              ? "ARM CONSTITUTIONAL COLLAPSE"
              : "GENERATE CHAOS THREAT"}
        </button>
      </div>
      {error ? (
        <p className="mt-1 text-[8px] text-zinc-400" role="alert">
          {error}
        </p>
      ) : null}
      {collapseArmed || selectedScenario === "CONSTITUTIONAL_COLLAPSE" ? (
        <ChaosConstitutionalCollapsePanel pollEnabled={collapseArmed} />
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
            Irontech · Chaos drills & adversary scenarios
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
