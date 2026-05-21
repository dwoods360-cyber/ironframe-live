import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CORE_WORKFORCE_AGENTS } from "@/app/config/agents";

const STORAGE_KEY = "ironframe-command-post-v1";

export type CommandPostCell = {
  colSpan: number;
  rowSpan: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Default spans by agent index (Ironscribe / cockpit defaults). */
export function defaultCommandPostCellForIndex(index: number): CommandPostCell {
  if (index === 6 || index === 12) return { colSpan: 4, rowSpan: 2 };
  if (index === 5 || index === 8 || index === 13) return { colSpan: 3, rowSpan: 2 };
  return { colSpan: 2, rowSpan: 1 };
}

export function seedCommandPostByAgentIndex(): Record<number, CommandPostCell> {
  const out: Record<number, CommandPostCell> = {};
  for (const a of CORE_WORKFORCE_AGENTS) {
    out[a.index] = defaultCommandPostCellForIndex(a.index);
  }
  return out;
}

export type CommandPostRiskSignal = {
  underSiege: boolean;
  freezeImminent: boolean;
  dominanceActive: boolean;
};

/** Apply Ironlock (6) + Ironguard (12) dominance when risk signal demands cockpit priority. */
export function applyRiskDominanceBoost(
  index: number,
  cell: CommandPostCell,
  risk: CommandPostRiskSignal,
): CommandPostCell {
  if (!risk.dominanceActive) return cell;
  if (index !== 6 && index !== 12) return cell;
  const tier = risk.underSiege && risk.freezeImminent ? 2 : 1;
  return {
    colSpan: clamp(cell.colSpan + 3 * tier, 1, 12),
    rowSpan: clamp(cell.rowSpan + 2 * tier, 1, 8),
  };
}

type CommandPostState = {
  byAgentIndex: Partial<Record<number, CommandPostCell>>;
  setAgentCell: (index: number, cell: CommandPostCell) => void;
  resetCommandPostLayout: () => void;
};

export const useCommandPostStore = create<CommandPostState>()(
  persist(
    (set) => ({
      byAgentIndex: {},
      setAgentCell: (index, cell) =>
        set((s) => ({
          byAgentIndex: {
            ...s.byAgentIndex,
            [index]: {
              colSpan: clamp(cell.colSpan, 1, 12),
              rowSpan: clamp(cell.rowSpan, 1, 8),
            },
          },
        })),
      resetCommandPostLayout: () => set({ byAgentIndex: seedCommandPostByAgentIndex() }),
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
      partialize: (s) => ({ byAgentIndex: s.byAgentIndex }),
    },
  ),
);
