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

/** Ephemeral in-process cache for Vercel / production (read-only filesystem). */
let serverlessMemoryState: GridcoreCarbonLedgerState | null = null;

function isServerlessCloud(): boolean {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

function emptyState(): GridcoreCarbonLedgerState {
  return { ...DEFAULT_STATE, coefficients: [] };
}

function parseState(raw: unknown): GridcoreCarbonLedgerState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return emptyState();
  const o = raw as GridcoreCarbonLedgerState;
  return {
    lastSynchronizedAt: typeof o.lastSynchronizedAt === "string" ? o.lastSynchronizedAt : null,
    coefficients: Array.isArray(o.coefficients) ? o.coefficients : [],
  };
}

export function readGridcoreCarbonLedgerStateSync(): GridcoreCarbonLedgerState {
  if (isServerlessCloud()) {
    return serverlessMemoryState ? parseState(serverlessMemoryState) : emptyState();
  }

  try {
    if (!existsSync(STATE_FILE)) return emptyState();
    return parseState(JSON.parse(readFileSync(STATE_FILE, "utf8")));
  } catch {
    return emptyState();
  }
}

export async function readGridcoreCarbonLedgerState(): Promise<GridcoreCarbonLedgerState> {
  return readGridcoreCarbonLedgerStateSync();
}

export async function writeGridcoreCarbonLedgerState(next: GridcoreCarbonLedgerState): Promise<void> {
  const parsed = parseState(next);

  if (isServerlessCloud()) {
    serverlessMemoryState = parsed;
    console.info("[ironbloom/gridcoreCarbonLedgerState] serverless memory persist (no disk write)", {
      lastSynchronizedAt: parsed.lastSynchronizedAt,
      coefficientCount: parsed.coefficients.length,
      zones: parsed.coefficients.map((c) => c.zone),
    });
    return;
  }

  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(parsed, null, 2), "utf8");
}
