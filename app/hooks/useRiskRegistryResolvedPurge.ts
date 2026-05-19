"use client";

import { useEffect } from "react";
import { RISK_REGISTRY_RESOLVED_LINGER_MS } from "@/app/utils/riskRegistryActiveStack";
import { runRiskRegistryResolvedPurgeNow } from "@/app/utils/riskRegistryResolvedPurge";

/** Drop expired RESOLVED rows from the registry store after the 4s linger window. */
export function useRiskRegistryResolvedPurge(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const iv = window.setInterval(() => {
      runRiskRegistryResolvedPurgeNow();
    }, Math.max(250, Math.floor(RISK_REGISTRY_RESOLVED_LINGER_MS / 8)));
    return () => window.clearInterval(iv);
  }, [enabled]);
}
