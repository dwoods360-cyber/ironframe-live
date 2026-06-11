"use client";

import { useEffect, useRef } from "react";
import { subscribeSimulationNavAbort } from "@/app/utils/simulationNavAbort";

export type SimulationFetchScope = {
  signal: AbortSignal;
  dispose: () => void;
};

/**
 * Unified AbortController scope for simulation-deck async work.
 * Aborts on sim-nav transitions and React effect cleanup.
 */
export function createSimulationFetchScope(
  reason = "simulation-fetch-cleanup",
): SimulationFetchScope {
  const controller = new AbortController();
  const detach = subscribeSimulationNavAbort(() => {
    controller.abort("simulation-nav-switch");
  });
  return {
    signal: controller.signal,
    dispose: () => {
      detach();
      if (!controller.signal.aborted) {
        controller.abort(reason);
      }
    },
  };
}

/**
 * Component-level hook — returns a stable ref to the active signal for polling loops.
 * Renews the controller when the prior signal was aborted (e.g. after sim-nav).
 */
export function useSimulationFetchAbort(): AbortSignal {
  const scopeRef = useRef<SimulationFetchScope | null>(null);

  if (!scopeRef.current || scopeRef.current.signal.aborted) {
    scopeRef.current?.dispose();
    scopeRef.current = createSimulationFetchScope("simulation-hook-renew");
  }

  useEffect(() => {
    const scope = scopeRef.current ?? createSimulationFetchScope("simulation-hook-mount");
    scopeRef.current = scope;
    return () => scope.dispose();
  }, []);

  return scopeRef.current.signal;
}
