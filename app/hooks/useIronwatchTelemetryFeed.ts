"use client";

import { useEffect, useRef } from "react";
import { ironwatchTelemetryPollOnce } from "@/src/services/ironwatch/telemetryFeeder";
import { useAgentRiskStore } from "@/app/store/agentRiskStore";

const POLL_MS = 5000;

/**
 * Ironwatch (Agent 15): 5s telemetry into `agentRiskStore`. Runs regardless of Command Post UI lock.
 */
export function useIronwatchTelemetryFeed(enabled = true) {
  const setIronwatchSnapshot = useAgentRiskStore((s) => s.setIronwatchSnapshot);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!enabled) return;

    const run = async () => {
      try {
        const snap = await ironwatchTelemetryPollOnce();
        if (!mounted.current) return;
        setIronwatchSnapshot(snap);
      } catch {
        /* network / parse — skip tick */
      }
    };

    void run();
    const id = window.setInterval(() => void run(), POLL_MS);
    return () => {
      mounted.current = false;
      window.clearInterval(id);
    };
  }, [enabled, setIronwatchSnapshot]);
}
