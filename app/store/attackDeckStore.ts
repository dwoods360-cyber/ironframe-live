"use client";

import { create } from "zustand";
import type { AttackDeckCardItem, AttackRiskCardPhase, AttackRiskCardProcessedData } from "@/app/types/attackRiskCard";

const MAX_ATTACK_DECK = 14;

type AttackDeckState = {
  cards: AttackDeckCardItem[];
  pushProcessingCard: (item: Omit<AttackDeckCardItem, "phase"> & { phase?: AttackRiskCardPhase }) => void;
  updateCard: (id: string, patch: Partial<Pick<AttackDeckCardItem, "phase" | "processedData" | "threatId">>) => void;
  clearDeck: () => void;
};

export const useAttackDeckStore = create<AttackDeckState>((set) => ({
  cards: [],
  pushProcessingCard: (item) =>
    set((state) => {
      const card: AttackDeckCardItem = {
        ...item,
        phase: item.phase ?? "PROCESSING",
      };
      const next = [card, ...state.cards].slice(0, MAX_ATTACK_DECK);
      return { cards: next };
    }),
  updateCard: (id, patch) =>
    set((state) => ({
      cards: state.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),
  clearDeck: () => set({ cards: [] }),
}));
