import type { LucideIcon } from "lucide-react";
import { CircleDot, Server, Cloud, Headset, Zap } from "lucide-react";

/** Irontech Chaos Levels 1–5 — deterministic chip + icon so cards never render “blank” severity. */
export const CHAOS_LEVEL_ICONS: readonly LucideIcon[] = [
  CircleDot,
  Server,
  Cloud,
  Headset,
  Zap,
];

export type ChaosLevelVisual = {
  level: number;
  label: string;
  chipClass: string;
  icon: LucideIcon;
};

const LEVEL_META: Record<number, { label: string; chipClass: string }> = {
  1: {
    label: "L1 · Internal",
    chipClass: "border-cyan-500/55 bg-cyan-950/40 text-cyan-100",
  },
  2: {
    label: "L2 · Home / Edge",
    chipClass: "border-amber-500/55 bg-amber-950/35 text-amber-100",
  },
  3: {
    label: "L3 · Cloud / Exfil",
    chipClass: "border-orange-500/55 bg-orange-950/35 text-orange-100",
  },
  4: {
    label: "L4 · Remote support",
    chipClass: "border-rose-500/50 bg-rose-950/30 text-rose-100",
  },
  5: {
    label: "L5 · Cascading",
    chipClass: "border-red-600/60 bg-red-950/40 text-red-100",
  },
};

export function resolveChaosDrillLevelForUi(
  chaosLevelFromStore: number | null | undefined,
  ingestionDetails: string | null | undefined,
): number | null {
  if (typeof chaosLevelFromStore === "number" && Number.isFinite(chaosLevelFromStore)) {
    return Math.min(5, Math.max(1, Math.round(chaosLevelFromStore)));
  }
  if (!ingestionDetails?.trim()) return null;
  try {
    const j = JSON.parse(ingestionDetails) as {
      chaos_level?: unknown;
      chaosScenario?: unknown;
    };
    if (typeof j.chaos_level === "number" && Number.isFinite(j.chaos_level)) {
      return Math.min(5, Math.max(1, Math.round(j.chaos_level)));
    }
    const scen = String(j.chaosScenario ?? "")
      .trim()
      .toUpperCase();
    const map: Record<string, number> = {
      INTERNAL: 1,
      HOME_SERVER: 2,
      CLOUD_EXFIL: 3,
      REMOTE_SUPPORT: 4,
      CASCADING_FAILURE: 5,
    };
    return map[scen] ?? null;
  } catch {
    return null;
  }
}

/** When Chaos is detected but level is missing, default to L1 so the card stays visible. */
export function chaosLevelForCardDisplay(
  chaosLevelFromStore: number | null | undefined,
  ingestionDetails: string | null | undefined,
  isChaosLane: boolean,
): number | null {
  const resolved = resolveChaosDrillLevelForUi(chaosLevelFromStore, ingestionDetails);
  if (resolved != null) return resolved;
  return isChaosLane ? 1 : null;
}

export function getChaosLevelVisual(level: number): ChaosLevelVisual {
  const clamped = Math.min(5, Math.max(1, Math.round(level)));
  const meta = LEVEL_META[clamped] ?? LEVEL_META[1];
  const icon = CHAOS_LEVEL_ICONS[clamped - 1] ?? CircleDot;
  return {
    level: clamped,
    label: meta.label,
    chipClass: meta.chipClass,
    icon,
  };
}

/** Active-board card shell accent — every Chaos level has a visible border treatment. */
export function getChaosLevelSurfaceAccent(level: number): string {
  const n = Math.min(5, Math.max(1, Math.round(level)));
  switch (n) {
    case 1:
      return "!border-cyan-500/35 !shadow-[0_0_12px_rgba(34,211,238,0.12)]";
    case 2:
      return "!border-amber-500/40 !shadow-[0_0_14px_rgba(245,158,11,0.15)]";
    case 3:
      return "!border-orange-500/40 !shadow-[0_0_14px_rgba(249,115,22,0.16)]";
    case 4:
      return "!border-rose-500/45 !shadow-[0_0_16px_rgba(244,63,94,0.18)]";
    case 5:
    default:
      return "!border-red-600/50 !shadow-[0_0_18px_rgba(220,38,38,0.22)]";
  }
}
