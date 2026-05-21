import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DIR = join(process.cwd(), "storage", "ironbloom");
const FILE = join(DIR, "carbon-budget-alert-state.json");

export type CarbonBudgetAlertSchedulerState = {
  /** `YYYY-MM` for which a Budget Reallocation alert was last dispatched. */
  lastAlertedMonthKey: string | null;
  lastRunAt: string;
  lastMitigatedValueCents: string;
  lastThresholdCents: string;
};

const DEFAULT_STATE: CarbonBudgetAlertSchedulerState = {
  lastAlertedMonthKey: null,
  lastRunAt: new Date(0).toISOString(),
  lastMitigatedValueCents: "0",
  lastThresholdCents: "0",
};

export function readCarbonBudgetAlertSchedulerState(): CarbonBudgetAlertSchedulerState {
  try {
    if (!existsSync(FILE)) return { ...DEFAULT_STATE };
    const raw = JSON.parse(readFileSync(FILE, "utf8")) as CarbonBudgetAlertSchedulerState;
    return {
      lastAlertedMonthKey:
        typeof raw.lastAlertedMonthKey === "string" ? raw.lastAlertedMonthKey : null,
      lastRunAt: typeof raw.lastRunAt === "string" ? raw.lastRunAt : DEFAULT_STATE.lastRunAt,
      lastMitigatedValueCents:
        typeof raw.lastMitigatedValueCents === "string" ? raw.lastMitigatedValueCents : "0",
      lastThresholdCents:
        typeof raw.lastThresholdCents === "string" ? raw.lastThresholdCents : "0",
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function writeCarbonBudgetAlertSchedulerState(next: CarbonBudgetAlertSchedulerState): void {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(next, null, 2), "utf8");
}
