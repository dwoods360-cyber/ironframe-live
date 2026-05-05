"use client";

import { useAgentStore } from "@/app/store/agentStore";

/** Call after `executeExpertAgentLifecycle` resolves to flash matching Active Risks cards (HUD). */
export function applyExpertLifecyclePivotFlashes(
  result:
    | { ok: true; pivotEvents?: { threatId: string; gateStep: number }[] }
    | { ok: false; error?: string },
): void {
  if (!result.ok || !result.pivotEvents?.length) return;
  const { flashAgentPivot } = useAgentStore.getState();
  const seen = new Set<string>();
  for (const ev of result.pivotEvents) {
    const tid = ev.threatId?.trim();
    if (!tid || seen.has(tid)) continue;
    seen.add(tid);
    flashAgentPivot(tid);
  }
}
