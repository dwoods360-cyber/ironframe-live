import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type GrAuditHistoryEntry = {
  id: string;
  threatId: string;
  recordedAt: string;
  eventType: "ACKNOWLEDGED" | "AUTONOMOUS_RESOLVED" | "MANUAL_RESOLVED";
  scenario: string | null;
  lkgAttestationIroncoreSha256: string | null;
  recoverySeconds: number | null;
  frameworkBadges: string[];
  controlLabel: string | null;
};

const MAX_AUDIT = 120;

type ComplianceOverlayState = {
  showCompliance: boolean;
  setShowCompliance: (v: boolean) => void;
  auditHistory: GrAuditHistoryEntry[];
  appendAuditEntry: (entry: Omit<GrAuditHistoryEntry, "id" | "recordedAt">) => void;
  clearGrAuditHistoryForPurge: () => void;
};

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useComplianceOverlayStore = create<ComplianceOverlayState>()(
  persist(
    (set, get) => ({
      showCompliance: false,
      setShowCompliance: (v) => set({ showCompliance: v }),
      auditHistory: [],
      appendAuditEntry: (entry) => {
        const recordedAt = new Date().toISOString();
        const id = newId();
        if (entry.eventType === "AUTONOMOUS_RESOLVED" && entry.recoverySeconds != null) {
          const dup = get().auditHistory.some(
            (e) =>
              e.threatId === entry.threatId &&
              e.eventType === "AUTONOMOUS_RESOLVED" &&
              e.recoverySeconds === entry.recoverySeconds,
          );
          if (dup) return;
        }
        set((s) => ({
          auditHistory: [{ ...entry, id, recordedAt }, ...s.auditHistory].slice(0, MAX_AUDIT),
        }));
      },
      clearGrAuditHistoryForPurge: () => set({ auditHistory: [] }),
    }),
    {
      name: "ironframe-grc-audit",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            },
      ),
      partialize: (s) => ({ auditHistory: s.auditHistory }),
    },
  ),
);
