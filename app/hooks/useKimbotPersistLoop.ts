"use client";

import { useEffect, useRef } from "react";
import { createKimbotThreatServer } from "@/app/actions/simulationActions";
import { useAgentStore } from "@/app/store/agentStore";
import { useKimbotStore } from "@/app/store/kimbotStore";
import { useRiskStore } from "@/app/store/riskStore";
import { KIMBOT_SOURCE } from "@/app/config/agents";
import { generateKimbotSignal, kimbotIntervalMs } from "@/app/utils/kimbotEngine";

/**
 * Global Kimbot → Prisma pipeline tick (must run off Strategic Intel so /opsupport can drive the same store).
 */
export function useKimbotPersistLoop() {
  const selectedIndustry = useRiskStore((s) => s.selectedIndustry);
  const isKimbotActive = useKimbotStore((s) => s.enabled);
  const kimbotIntensity = useKimbotStore((s) => s.intensity);
  const kimbotAttackType = useKimbotStore((s) => s.attackType);
  const addInjectedSignal = useKimbotStore((s) => s.addInjectedSignal);
  const addStreamMessage = useAgentStore((s) => s.addStreamMessage);
  const kimbotIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isKimbotActive) {
      if (kimbotIntervalRef.current) {
        clearInterval(kimbotIntervalRef.current);
        kimbotIntervalRef.current = null;
      }
      return;
    }

    const tick = () => {
      const signal = generateKimbotSignal(selectedIndustry, kimbotAttackType, kimbotIntensity);
      void (async () => {
        try {
          const created = await createKimbotThreatServer({
            title: signal.title,
            sector: signal.targetSector ?? selectedIndustry,
            liability: signal.liability,
            source: KIMBOT_SOURCE,
            severity: Math.min(10, Math.max(1, Math.round(signal.severityScore / 10))),
          });
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
          addInjectedSignal({
            ...signal,
            id: created.id,
          });
          addStreamMessage(`> [${new Date().toISOString()}] KIMBOT: ${signal.title} (${signal.severity})`);
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
  }, [isKimbotActive, kimbotIntensity, kimbotAttackType, selectedIndustry, addInjectedSignal, addStreamMessage]);
}
