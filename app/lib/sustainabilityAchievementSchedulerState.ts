import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DIR = join(process.cwd(), "storage", "investor-reports");
const FILE = join(DIR, "scheduler-state.json");

export type SustainabilityAchievementSchedulerState = {
  /** Last `daysActive` milestone (e.g. 30, 60) for which a report was generated. */
  lastMilestoneDays: number;
  lastRunAt: string;
  /** When self-healing was last anchored; if it changes, milestone counter resets. */
  anchorSelfHealingSince?: string | null;
};

const DEFAULT_STATE: SustainabilityAchievementSchedulerState = {
  lastMilestoneDays: 0,
  lastRunAt: new Date(0).toISOString(),
  anchorSelfHealingSince: null,
};

export function readSustainabilityAchievementSchedulerState(): SustainabilityAchievementSchedulerState {
  try {
    if (!existsSync(FILE)) return { ...DEFAULT_STATE };
    const raw = JSON.parse(readFileSync(FILE, "utf8")) as SustainabilityAchievementSchedulerState;
    if (typeof raw.lastMilestoneDays !== "number" || raw.lastMilestoneDays < 0) return { ...DEFAULT_STATE };
    return {
      lastMilestoneDays: raw.lastMilestoneDays,
      lastRunAt: typeof raw.lastRunAt === "string" ? raw.lastRunAt : DEFAULT_STATE.lastRunAt,
      anchorSelfHealingSince:
        typeof raw.anchorSelfHealingSince === "string" ? raw.anchorSelfHealingSince : null,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function writeSustainabilityAchievementSchedulerState(
  next: SustainabilityAchievementSchedulerState,
): void {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(next, null, 2), "utf8");
}
