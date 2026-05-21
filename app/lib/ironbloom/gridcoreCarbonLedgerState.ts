import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const STATE_DIR = join(process.cwd(), "storage", "constitutional");
const STATE_FILE = join(STATE_DIR, "ironbloom-gridcore-carbon-ledger.json");

/** Physical-only grid coefficient row (no monetary fields — Ironbloom isolation boundary). */
export type GridcoreCarbonCoefficientRecord = {
  zone: string;
  carbonIntensityGrams: string;
  carbonIntensityGco2PerKwh: number;
  renewablePercentage: number | null;
  source: string;
  polledAt: string;
  telemetryFingerprint: string;
};

export type GridcoreCarbonLedgerState = {
  lastSynchronizedAt: string | null;
  coefficients: GridcoreCarbonCoefficientRecord[];
};

const DEFAULT_STATE: GridcoreCarbonLedgerState = {
  lastSynchronizedAt: null,
  coefficients: [],
};

function parseState(raw: unknown): GridcoreCarbonLedgerState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULT_STATE };
  const o = raw as GridcoreCarbonLedgerState;
  return {
    lastSynchronizedAt: typeof o.lastSynchronizedAt === "string" ? o.lastSynchronizedAt : null,
    coefficients: Array.isArray(o.coefficients) ? o.coefficients : [],
  };
}

export function readGridcoreCarbonLedgerStateSync(): GridcoreCarbonLedgerState {
  try {
    if (!existsSync(STATE_FILE)) return { ...DEFAULT_STATE };
    return parseState(JSON.parse(readFileSync(STATE_FILE, "utf8")));
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export async function readGridcoreCarbonLedgerState(): Promise<GridcoreCarbonLedgerState> {
  return readGridcoreCarbonLedgerStateSync();
}

export async function writeGridcoreCarbonLedgerState(next: GridcoreCarbonLedgerState): Promise<void> {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(next, null, 2), "utf8");
}
