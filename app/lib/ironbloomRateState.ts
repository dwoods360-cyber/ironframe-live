import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { PhysicalUnitType, UtilityRateQuote } from "@/app/types/ironbloomGridcore";

const STATE_DIR = join(process.cwd(), "storage", "constitutional");
const STATE_FILE = join(STATE_DIR, "ironbloom-gridcore-rates.json");

export const IRONBLOOM_RATE_POLL_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
export const IRONBLOOM_RATE_DRIFT_THRESHOLD = 0.15;

export type CachedTenantRate = {
  tenantKey: string;
  quote: UtilityRateQuote;
  lastPolledAt: string;
};

export type IronbloomRateState = {
  lastGlobalPollAt: string | null;
  rates: CachedTenantRate[];
  alerts: Array<{
    id: string;
    tenantKey: string;
    sentAt: string;
    previousRateUsd: number;
    newRateUsd: number;
    driftRatio: number;
    unitType: PhysicalUnitType;
    pulseMessage: string;
  }>;
};

const DEFAULT_STATE: IronbloomRateState = {
  lastGlobalPollAt: null,
  rates: [],
  alerts: [],
};

function parseState(raw: unknown): IronbloomRateState | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as IronbloomRateState;
  if (!Array.isArray(o.rates)) return null;
  return {
    ...DEFAULT_STATE,
    ...o,
    rates: o.rates,
    alerts: Array.isArray(o.alerts) ? o.alerts : [],
  };
}

export function readIronbloomRateStateSync(): IronbloomRateState {
  try {
    if (!existsSync(STATE_FILE)) return { ...DEFAULT_STATE };
    return parseState(JSON.parse(readFileSync(STATE_FILE, "utf8"))) ?? { ...DEFAULT_STATE };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export async function readIronbloomRateState(): Promise<IronbloomRateState> {
  return readIronbloomRateStateSync();
}

export async function writeIronbloomRateState(next: IronbloomRateState): Promise<void> {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(next, null, 2), "utf8");
}

export function getCachedRateForTenant(
  state: IronbloomRateState,
  tenantKey: string,
): CachedTenantRate | undefined {
  return state.rates.find((r) => r.tenantKey === tenantKey);
}

export function isRatePollDue(state: IronbloomRateState, now = Date.now()): boolean {
  if (!state.lastGlobalPollAt) return true;
  const last = Date.parse(state.lastGlobalPollAt);
  if (!Number.isFinite(last)) return true;
  return now - last >= IRONBLOOM_RATE_POLL_INTERVAL_MS;
}
