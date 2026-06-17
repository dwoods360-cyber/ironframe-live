"use client";



import { useEffect, useMemo, useRef } from "react";

import { useAgentStore } from "@/app/store/agentStore";
import { useAgentRiskStore } from "@/app/store/agentRiskStore";

import { useRiskStore } from "@/app/store/riskStore";

import { useSystemConfigStore } from "@/app/store/systemConfigStore";

import { formatIntelStreamLine } from "@/app/utils/intelligenceStreamFormat";

import { createSimulationFetchScope } from "@/app/hooks/useSimulationFetchAbort";

import { fetchIronintelResilienceLines } from "@/app/lib/client/simulationAgentFetch";

import { isSimulationFetchAborted } from "@/app/utils/simulationNavAbort";
import { isDemoModeActive } from "@/app/lib/demo/demoMode";



const POLL_MS = 2500;



/** Irontech / Ironintel resilience lines → Intelligence Stream (Expert Mode subscription). */

export function useResilienceIntelPoll() {

  const expertModeEnabled = useSystemConfigStore().expertModeEnabled;

  const resilienceStreamCursorRef = useRef<string>(new Date(Date.now() - 1000).toISOString());

  const pipelineThreats = useRiskStore((s) => s.pipelineThreats);

  const activeThreats = useRiskStore((s) => s.activeThreats);

  const showSimulationRef = useRef(false);
  showSimulationRef.current = useMemo(
    () =>
      [...pipelineThreats, ...activeThreats].some((t) =>
        (t.ingestionDetails ?? "").includes('"isChaosTest":true'),
      ),
    [activeThreats, pipelineThreats],
  );

  useEffect(() => {
    if (isDemoModeActive()) return;
    if (!expertModeEnabled) return;

    const scope = createSimulationFetchScope();
    const { signal } = scope;

    resilienceStreamCursorRef.current = new Date(Date.now() - 1000).toISOString();

    const pollOnce = async () => {
      if (signal.aborted) return;

      try {
        const since = resilienceStreamCursorRef.current;
        const rows = await fetchIronintelResilienceLines(
          signal,
          since,
          showSimulationRef.current,
        );

        if (isSimulationFetchAborted(signal)) return;

        useAgentRiskStore.getState().setShowcaseExecutionStrain(11, false);

        if (rows.length === 0) return;

        const add = useAgentStore.getState().addStreamMessage;

        for (const r of rows) {

          add(formatIntelStreamLine(r.line, new Date(r.createdAt)));

        }

        resilienceStreamCursorRef.current = rows[rows.length - 1]!.createdAt;

      } catch (error) {

        if (!isSimulationFetchAborted(signal, error)) {
          useAgentRiskStore.getState().setShowcaseExecutionStrain(11, true);
          console.warn("[Ironintel] resilience poll interrupted", error);
        }

      }

    };



    const onResubscribe = () => {

      if (signal.aborted) return;

      resilienceStreamCursorRef.current = new Date(Date.now() - 1000).toISOString();

      void pollOnce();

    };

    window.addEventListener("ironframe:resilience-feed-resubscribe", onResubscribe);



    void pollOnce();

    const id = setInterval(() => void pollOnce(), POLL_MS);

    return () => {

      scope.dispose();

      clearInterval(id);

      window.removeEventListener("ironframe:resilience-feed-resubscribe", onResubscribe);

    };

  }, [expertModeEnabled]);

}

