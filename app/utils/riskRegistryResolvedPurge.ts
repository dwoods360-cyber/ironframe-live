"use client";

import { useRiskRegistryStore } from "@/app/store/riskRegistryStore";
import type { RiskRegistryRecord } from "@/app/types/riskLifecycle";
import {
  ensureResolvedAtStamped,
  isLegitimateRegistryRecord,
  isWithinResolvedLingerWindow,
  resolvedAtForRegistryRecord,
} from "@/app/utils/riskRegistryActiveStack";

/** Drop expired RESOLVED registry rows immediately (same rules as `useRiskRegistryResolvedPurge`). */
export function runRiskRegistryResolvedPurgeNow(): void {
  const now = Date.now();
  const { records } = useRiskRegistryStore.getState();
  const next = records.filter((r) => {
    if (!isLegitimateRegistryRecord(r)) return false;
    if (r.lifecycleStatus !== "RESOLVED") return true;
    const stamped = ensureResolvedAtStamped(r);
    return isWithinResolvedLingerWindow(resolvedAtForRegistryRecord(stamped), now);
  });
  if (next.length !== records.length) {
    useRiskRegistryStore.setState({ records: next });
  }
}

/** Link ThreatEvent / chaos row → registry queue: stamp RESOLVED so partition + purge can run. */
export function markRegistryResolvedForThreatEvent(
  threatEventId: string,
  resolvedAtIso?: string,
): void {
  const tid = threatEventId.trim();
  if (!tid) return;
  const { records, upsertRecord } = useRiskRegistryStore.getState();
  const resolvedAt = resolvedAtIso?.trim() || new Date().toISOString();
  let touched = false;
  for (const row of records) {
    if (row.riskEventId?.trim() !== tid) continue;
    upsertRecord(
      ensureResolvedAtStamped({
        ...row,
        lifecycleStatus: "RESOLVED",
        resolvedAt,
      }),
    );
    touched = true;
  }
  if (touched) {
    runRiskRegistryResolvedPurgeNow();
  }
}

/** Merge server-persisted registry rows after forensic gavel (Supabase `risk_registry`). */
export function hydrateRegistryResolutionFromServer(records: RiskRegistryRecord[]): void {
  if (!records.length) return;
  const upsertRecord = useRiskRegistryStore.getState().upsertRecord;
  for (const row of records) {
    upsertRecord(ensureResolvedAtStamped(row));
  }
}
