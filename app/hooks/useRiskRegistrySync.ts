"use client";

import { useEffect, useRef } from "react";
import { listRiskRegistryRecordsAction } from "@/app/actions/riskLifecycleActions";
import { useRiskRegistryStore } from "@/app/store/riskRegistryStore";
import type { RiskRegistryRecord } from "@/app/types/riskLifecycle";
import { useRiskRegistryResolvedPurge } from "@/app/hooks/useRiskRegistryResolvedPurge";
import { ensureResolvedAtStamped } from "@/app/utils/riskRegistryActiveStack";

function recordsSignature(records: RiskRegistryRecord[]): string {
  return records
    .map((r) => `${r.id}:${r.lifecycleStatus}:${r.resolvedAt ?? ""}:${r.updatedAt}`)
    .join("|");
}

/** Hydrate lifecycle queue from RSC once + optional server refresh (no render loops). */
export function useRiskRegistrySync(
  enabled: boolean,
  initialRecords: RiskRegistryRecord[] = [],
) {
  const hydrate = useRiskRegistryStore((s) => s.hydrate);
  const initialSigRef = useRef<string | null>(null);
  const fetchedRef = useRef(false);

  useRiskRegistryResolvedPurge(enabled);

  useEffect(() => {
    if (!enabled) return;
    const upsertRecord = useRiskRegistryStore.getState().upsertRecord;
    return useRiskRegistryStore.subscribe((state) => {
      for (const row of state.records) {
        if (row.lifecycleStatus === "RESOLVED" && !row.resolvedAt?.trim()) {
          upsertRecord(ensureResolvedAtStamped(row));
        }
      }
    });
  }, [enabled]);

  useEffect(() => {
    if (initialRecords.length === 0) return;
    const sig = recordsSignature(initialRecords);
    if (initialSigRef.current === sig) return;
    initialSigRef.current = sig;
    hydrate(initialRecords);
  }, [initialRecords, hydrate]);

  useEffect(() => {
    if (!enabled || fetchedRef.current) return;
    fetchedRef.current = true;
    void listRiskRegistryRecordsAction().then((res) => {
      if (res.ok && res.records.length > 0) {
        hydrate(res.records);
      }
    });
  }, [enabled, hydrate]);
}
