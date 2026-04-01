"use client";

import { useEffect, useRef } from "react";
import { useAgentStore, type IronwaveTelemetryPhase } from "@/app/store/agentStore";

const PHASE_ORDER: IronwaveTelemetryPhase[] = ["ASSIGNED", "SCANNING", "VERIFIED"];
const DWELL_MS: Record<IronwaveTelemetryPhase, number> = {
  ASSIGNED: 2400,
  SCANNING: 2000,
  VERIFIED: 1800,
};

/**
 * Tenant-scoped heartbeat: cycles IDLE/ASSIGNED → SCANNING → VERIFIED so Risk / Threat shells can “breathe”.
 * Irongate / Ironlock lines can temporarily lock SCANNING via the agent store.
 */
export function IronwaveHeartbeat({ tenantUuid }: { tenantUuid: string | null }) {
  const cancelledRef = useRef(false);

  useEffect(() => {
    useAgentStore.getState().setTelemetryTenantScope(tenantUuid);
  }, [tenantUuid]);

  useEffect(() => {
    cancelledRef.current = false;
    if (!tenantUuid) {
      useAgentStore.getState().setIronwaveFromHeartbeat("ASSIGNED");
      return () => {
        cancelledRef.current = true;
      };
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const runPhase = (index: number) => {
      if (cancelledRef.current) return;
      const phase = PHASE_ORDER[index % PHASE_ORDER.length]!;
      const ok = useAgentStore.getState().setIronwaveFromHeartbeat(phase);
      if (!ok) {
        timeoutId = setTimeout(() => runPhase(index), 220);
        return;
      }
      timeoutId = setTimeout(() => runPhase(index + 1), DWELL_MS[phase]);
    };

    runPhase(0);

    return () => {
      cancelledRef.current = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [tenantUuid]);

  return null;
}
