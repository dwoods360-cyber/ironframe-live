"use client";

import { useEffect, useRef } from "react";
import { useTenantContext } from "@/app/context/TenantProvider";
import { createKimbotThreatServer } from "@/app/actions/simulationActions";
import {
  ingestRedTeamRiskAction,
  processRiskLifecycleAction,
} from "@/app/actions/riskLifecycleActions";
import { KIMBOT_SOURCE } from "@/app/config/agents";
import { logRedTeamActionTracker } from "@/app/lib/redTeamActionTracker";
import { useAgentStore } from "@/app/store/agentStore";
import { useKimbotStore } from "@/app/store/kimbotStore";
import { useRiskStore } from "@/app/store/riskStore";
import { useRiskRegistryStore } from "@/app/store/riskRegistryStore";
import { deltaLabelForLifecycle } from "@/app/utils/riskRegistryCardMap";
import { formatCentsToUSD } from "@/app/utils/formatCentsToUSD";
import { generateKimbotSignal, kimbotIntervalMs } from "@/app/utils/kimbotEngine";
import { resolveEffectiveTenantUuidForActions } from "@/app/utils/resolveEffectiveTenantUuidForActions";
import { isDemoModeActive } from "@/app/lib/demo/demoMode";
import type { RiskRegistryRecord } from "@/app/types/riskLifecycle";

function newLocalRegistryId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `local-${crypto.randomUUID()}`;
  }
  return `local-${Date.now()}`;
}

function localRegistryRecord(
  partial: Pick<RiskRegistryRecord, "id" | "title" | "telemetryValue"> & {
    lifecycleStatus: RiskRegistryRecord["lifecycleStatus"];
    ingestionDetails?: unknown;
    riskEventId?: string | null;
  },
): RiskRegistryRecord {
  const now = new Date().toISOString();
  return {
    id: partial.id,
    tenantId: "",
    title: partial.title,
    telemetryValue: partial.telemetryValue,
    deltaLabel: deltaLabelForLifecycle(partial.lifecycleStatus),
    sourceAgent: KIMBOT_SOURCE,
    lifecycleStatus: partial.lifecycleStatus,
    riskEventId: partial.riskEventId ?? null,
    ingestionDetails:
      typeof partial.ingestionDetails === "string"
        ? partial.ingestionDetails
        : partial.ingestionDetails != null
          ? JSON.stringify(partial.ingestionDetails)
          : null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Kimbot tick → unified risk_registry queue (INGESTED → REGISTERED → ACTIVE).
 */
export function useKimbotPersistLoop() {
  const { activeTenantUuid } = useTenantContext();
  const selectedTenantName = useRiskStore((s) => s.selectedTenantName);
  const selectedIndustry = useRiskStore((s) => s.selectedIndustry);
  const isKimbotActive = useKimbotStore((s) => s.enabled);
  const kimbotIntensity = useKimbotStore((s) => s.intensity);
  const kimbotAttackType = useKimbotStore((s) => s.attackType);
  const addInjectedSignal = useKimbotStore((s) => s.addInjectedSignal);
  const addStreamMessage = useAgentStore((s) => s.addStreamMessage);
  const upsertRecord = useRiskRegistryStore((s) => s.upsertRecord);
  const kimbotIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isDemoModeActive()) return;
    if (!isKimbotActive) {
      if (kimbotIntervalRef.current) {
        clearInterval(kimbotIntervalRef.current);
        kimbotIntervalRef.current = null;
      }
      return;
    }

    const tick = () => {
      const tenantUuid = resolveEffectiveTenantUuidForActions(activeTenantUuid, selectedTenantName);
      const signal = generateKimbotSignal(selectedIndustry, kimbotAttackType, kimbotIntensity);
      const targetAsset = signal.targetSector ?? selectedIndustry;
      const telemetryValue = `$${signal.liability.toFixed(1)}M ALE`;

      void (async () => {
        try {
          if (!tenantUuid) {
            addStreamMessage(
              "> [KIMBOT] Paused: select a Command Center tenant or enable simulation / Shadow Plane.",
            );
            return;
          }

          const trackerInput = {
            attackVector: signal.title,
            targetAsset,
            agentId: KIMBOT_SOURCE,
            payloadDetails: signal.description,
          };
          logRedTeamActionTracker("REGISTERED", trackerInput);

          const ingested = await ingestRedTeamRiskAction({
            title: signal.title,
            telemetryValue,
            sourceAgent: KIMBOT_SOURCE,
            payload: {
              description: signal.description,
              severity: signal.severity,
              targetSector: targetAsset,
            },
          });

          let registryId = ingested.record?.id ?? newLocalRegistryId();
          if (ingested.record) {
            upsertRecord(ingested.record);
          } else {
            upsertRecord(
              localRegistryRecord({
                id: registryId,
                title: signal.title,
                telemetryValue,
                lifecycleStatus: "INGESTED",
                ingestionDetails: signal.description,
              }),
            );
          }

          const registered = await processRiskLifecycleAction(registryId);
          if (registered.record) {
            upsertRecord(registered.record);
            registryId = registered.record.id;
          } else {
            upsertRecord(
              localRegistryRecord({
                id: registryId,
                title: signal.title,
                telemetryValue,
                lifecycleStatus: "REGISTERED",
                ingestionDetails: signal.description,
              }),
            );
          }

          const created = await createKimbotThreatServer({
            title: signal.title,
            sector: targetAsset,
            liability: signal.liability,
            source: KIMBOT_SOURCE,
            severity: Math.min(10, Math.max(1, Math.round(signal.severityScore / 10))),
          });

          const active = await processRiskLifecycleAction(registryId, {
            riskEventId: created.id,
          });
          if (active.record) {
            upsertRecord(active.record);
          } else {
            upsertRecord(
              localRegistryRecord({
                id: registryId,
                title: signal.title,
                telemetryValue: formatCentsToUSD(String(created.financialRisk_cents)),
                lifecycleStatus: "ACTIVE",
                riskEventId: created.id,
                ingestionDetails: signal.description,
              }),
            );
          }

          useRiskStore.getState().upsertPipelineThreat({
            id: created.id,
            name: created.title,
            loss: created.financialRisk_cents / 100_000_000,
            score: created.score,
            industry: created.targetEntity,
            source: created.sourceAgent,
            description: `Red Team Attack - $${(created.financialRisk_cents / 100_000_000).toFixed(1)}M - ${created.sourceAgent}`,
          });
          await useRiskStore.getState().pulseThreatBoardsFromDb();
          addInjectedSignal({ ...signal, id: created.id });
          addStreamMessage(
            `> [${new Date().toISOString()}] KIMBOT: ${signal.title} (${signal.severity}) · registry ${registryId}`,
          );
        } catch (e) {
          addStreamMessage(`> [KIMBOT] Failed to persist: ${e instanceof Error ? e.message : "Unknown"}`);
        }
      })();
    };

    tick();
    const ms = kimbotIntervalMs(kimbotIntensity);
    kimbotIntervalRef.current = setInterval(tick, ms);

    return () => {
      if (kimbotIntervalRef.current) {
        clearInterval(kimbotIntervalRef.current);
        kimbotIntervalRef.current = null;
      }
    };
  }, [
    activeTenantUuid,
    selectedTenantName,
    isKimbotActive,
    kimbotIntensity,
    kimbotAttackType,
    selectedIndustry,
    addInjectedSignal,
    addStreamMessage,
    upsertRecord,
  ]);
}
