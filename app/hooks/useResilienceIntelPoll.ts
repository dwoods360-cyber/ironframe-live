"use client";

import { useEffect, useMemo, useRef } from "react";
import { pollResilienceIntelStreamLines } from "@/app/actions/resilienceIntelStreamActions";
import { useAgentStore } from "@/app/store/agentStore";
import { useRiskStore } from "@/app/store/riskStore";

/** Irontech / Ironintel resilience lines → Intelligence Stream (global so it runs off Strategic Intel). */
export function useResilienceIntelPoll() {
  const resilienceStreamCursorRef = useRef<string>(new Date(Date.now() - 1000).toISOString());
  const pipelineThreats = useRiskStore((s) => s.pipelineThreats);
  const activeThreats = useRiskStore((s) => s.activeThreats);
  const showSimulation = useMemo(
    () =>
      [...pipelineThreats, ...activeThreats].some((t) =>
        (t.ingestionDetails ?? "").includes('"isChaosTest":true'),
      ),
    [activeThreats, pipelineThreats],
  );

  useEffect(() => {
    resilienceStreamCursorRef.current = new Date(Date.now() - 1000).toISOString();
    const onResubscribe = () => {
      resilienceStreamCursorRef.current = new Date(Date.now() - 1000).toISOString();
    };
    window.addEventListener("ironframe:resilience-feed-resubscribe", onResubscribe);

    const id = setInterval(() => {
      void (async () => {
        const since = resilienceStreamCursorRef.current;
        const rows = await pollResilienceIntelStreamLines(since, {
          showSimulation,
        });
        if (rows.length === 0) return;
        const add = useAgentStore.getState().addStreamMessage;
        for (const r of rows) {
          add(r.line);
        }
        resilienceStreamCursorRef.current = rows[rows.length - 1]!.createdAt;
      })();
    }, 2500);
    return () => {
      clearInterval(id);
      window.removeEventListener("ironframe:resilience-feed-resubscribe", onResubscribe);
    };
  }, [showSimulation]);
}
