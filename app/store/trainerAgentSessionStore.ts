"use client";

import { create } from "zustand";

export type TrainerSessionTurn = {
  id: string;
  topic: string;
  lesson: string;
};

type TrainerAgentSessionState = {
  turns: TrainerSessionTurn[];
  appendTurn: (turn: TrainerSessionTurn) => void;
  clearTurns: () => void;
};

export const useTrainerAgentSessionStore = create<TrainerAgentSessionState>((set) => ({
  turns: [],
  appendTurn: (turn) =>
    set((state) => ({
      turns: [...state.turns, turn],
    })),
  clearTurns: () => set({ turns: [] }),
}));

export function normalizeTrainerLesson(raw: string | null | undefined): string {
  const trimmed = raw?.trim();
  if (trimmed) return trimmed;
  return "Trainer returned an empty lesson payload. Retry or pick a suggested prompt.";
}
