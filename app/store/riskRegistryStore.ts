"use client";

import { create } from "zustand";
import type { RiskRegistryRecord } from "@/app/types/riskLifecycle";

function sameRegistrySnapshot(a: RiskRegistryRecord[], b: RiskRegistryRecord[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].id !== b[i].id) return false;
    if (a[i].lifecycleStatus !== b[i].lifecycleStatus) return false;
    if (a[i].resolvedAt !== b[i].resolvedAt) return false;
    if (a[i].updatedAt !== b[i].updatedAt) return false;
  }
  return true;
}

type RiskRegistryState = {
  records: RiskRegistryRecord[];
  hydrate: (records: RiskRegistryRecord[]) => void;
  upsertRecord: (record: RiskRegistryRecord) => void;
  clear: () => void;
};

export const useRiskRegistryStore = create<RiskRegistryState>((set) => ({
  records: [],
  hydrate: (records) =>
    set((state) => (sameRegistrySnapshot(state.records, records) ? state : { records })),
  upsertRecord: (record) =>
    set((state) => {
      const idx = state.records.findIndex((r) => r.id === record.id);
      const prev = idx >= 0 ? state.records[idx] : null;
      let normalized = record;
      if (record.lifecycleStatus === "RESOLVED") {
        const at = record.resolvedAt?.trim() || new Date().toISOString();
        normalized = { ...record, resolvedAt: at };
      } else {
        normalized = { ...record, resolvedAt: null };
      }
      const next =
        idx >= 0
          ? state.records.map((r, i) => (i === idx ? normalized : r))
          : [normalized, ...state.records].slice(0, 32);
      return sameRegistrySnapshot(state.records, next) ? state : { records: next };
    }),
  clear: () => set({ records: [] }),
}));
