import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { SimulatedAuditHotSwap, SimulatedAuditReport } from "@/app/types/simulatedAudit";

const STATE_DIR = join(process.cwd(), "storage", "constitutional");
const STATE_FILE = join(STATE_DIR, "simulated-audit.json");
const STAGING_TAS = join(STATE_DIR, "TAS.md.amendment-staging");

export type SimulatedAuditState = {
  activeHotSwap: SimulatedAuditHotSwap | null;
  lastReport: SimulatedAuditReport | null;
  reports: SimulatedAuditReport[];
};

const DEFAULT_STATE: SimulatedAuditState = {
  activeHotSwap: null,
  lastReport: null,
  reports: [],
};

function parseState(raw: unknown): SimulatedAuditState | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as SimulatedAuditState;
  return {
    activeHotSwap: o.activeHotSwap ?? null,
    lastReport: o.lastReport ?? null,
    reports: Array.isArray(o.reports) ? o.reports : [],
  };
}

export function readSimulatedAuditStateSync(): SimulatedAuditState {
  try {
    if (!existsSync(STATE_FILE)) return DEFAULT_STATE;
    return parseState(JSON.parse(readFileSync(STATE_FILE, "utf8"))) ?? DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

export async function readSimulatedAuditState(): Promise<SimulatedAuditState> {
  return readSimulatedAuditStateSync();
}

export async function writeSimulatedAuditState(state: SimulatedAuditState): Promise<void> {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  const trimmed = {
    ...state,
    reports: state.reports.slice(0, 20),
  };
  writeFileSync(STATE_FILE, JSON.stringify(trimmed, null, 2), "utf8");
}

export function writeAmendmentStagingTas(content: string): void {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STAGING_TAS, content, "utf8");
}

export function readAmendmentStagingTas(): string | null {
  if (!existsSync(STAGING_TAS)) return null;
  try {
    return readFileSync(STAGING_TAS, "utf8");
  } catch {
    return null;
  }
}

export function getAmendmentStagingPath(): string {
  return STAGING_TAS;
}
