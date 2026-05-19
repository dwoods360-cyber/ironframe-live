"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type AgentLayoutQueueSource = "ironscribe" | "ironwatch";

export type QueuedAgentLayoutRequest = {
  source: AgentLayoutQueueSource;
  reason: string;
  enqueuedAt: number;
};

type LayoutState = {
  /** When true: Command Post ignores agent-led span boosts and manual resize commits stay frozen. */
  isUiLocked: boolean;
  /** Ephemeral toast copy after locking. */
  lockToast: string | null;
  /** Ironcast (Agent 7) — success / advisory line (e.g. human anomaly ack on Command Post). */
  ironcastToast: string | null;
  /** Patches from Ironscribe (risk dominance) / Ironwatch-style signals held until unlock. */
  agentLayoutQueue: QueuedAgentLayoutRequest[];
  setUiLocked: (v: boolean) => void;
  toggleUiLocked: () => void;
  dismissLockToast: () => void;
  showIroncastToast: (message: string) => void;
  dismissIroncastToast: () => void;
  /** Called when agent-led layout would have run but `isUiLocked` blocks execution. */
  enqueueAgentLayoutRequest: (patch: Omit<QueuedAgentLayoutRequest, "enqueuedAt">) => void;
  clearAgentLayoutQueue: () => void;
};

const STORAGE_KEY = "ironframe-layout-store-v1";

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      isUiLocked: false,
      lockToast: null,
      ironcastToast: null,
      agentLayoutQueue: [],
      setUiLocked: (v) =>
        set((s) => ({
          isUiLocked: v,
          lockToast: v
            ? "Command Post Locked. Agent-led layout adjustments suspended for manual audit."
            : null,
          agentLayoutQueue: v ? s.agentLayoutQueue : [],
        })),
      toggleUiLocked: () => {
        const next = !get().isUiLocked;
        get().setUiLocked(next);
      },
      dismissLockToast: () => set({ lockToast: null }),
      showIroncastToast: (message) =>
        set({
          ironcastToast: message.trim().slice(0, 400) || null,
        }),
      dismissIroncastToast: () => set({ ironcastToast: null }),
      enqueueAgentLayoutRequest: (patch) => {
        if (!get().isUiLocked) return;
        set((s) => ({
          agentLayoutQueue: [...s.agentLayoutQueue, { ...patch, enqueuedAt: Date.now() }].slice(-50),
        }));
      },
      clearAgentLayoutQueue: () => set({ agentLayoutQueue: [] }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            },
      ),
      partialize: (s) => ({
        isUiLocked: s.isUiLocked,
        agentLayoutQueue: s.agentLayoutQueue,
      }),
    },
  ),
);
