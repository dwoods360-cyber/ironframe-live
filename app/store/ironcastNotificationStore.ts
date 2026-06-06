"use client";

import { create } from "zustand";

export type IroncastNotificationToast = {
  id: string;
  threatDetected: string;
  agentAction: string;
  severity: "critical" | "warning";
  createdAt: number;
};

type IroncastNotificationState = {
  toasts: IroncastNotificationToast[];
  pushToast: (toast: Omit<IroncastNotificationToast, "id" | "createdAt">) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
};

const MAX_STACK = 4;

/** Sticky retention — analyst dismiss only (no auto-hide timer). */
export const IRONCAST_TOAST_DURATION_MS = Infinity;

export const useIroncastNotificationStore = create<IroncastNotificationState>((set) => ({
  toasts: [],
  pushToast: (toast) => {
    const id = `ironcast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((state) => ({
      toasts: [{ ...toast, id, createdAt: Date.now() }, ...state.toasts].slice(0, MAX_STACK),
    }));
    return id;
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}));
