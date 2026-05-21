import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export {
  GOVERNANCE_DEGRADATION_ACTION,
  GOVERNANCE_DEGRADATION_THRESHOLD,
  GOVERNANCE_MATURITY_MAX,
  GOVERNANCE_MATURITY_MIN,
  GOVERNANCE_MATURITY_TREND_DAYS,
  GOVERNANCE_NEUTRALIZE_MIN_DEGRADED,
  GOVERNANCE_NEUTRALIZE_MIN_NORMAL,
  IRONLOCK_STALE_DATA_FORENSIC_MIN_CHARS,
} from "@/app/config/governanceMaturityConstants";

import {
  GOVERNANCE_MATURITY_MIN,
  GOVERNANCE_MATURITY_MAX,
  GOVERNANCE_NEUTRALIZE_MIN_NORMAL,
  GOVERNANCE_NEUTRALIZE_MIN_DEGRADED,
  IRONLOCK_STALE_DATA_FORENSIC_MIN_CHARS,
  GOVERNANCE_MATURITY_TREND_DAYS,
} from "@/app/config/governanceMaturityConstants";

export type {
  GovernanceMaturitySnapshot,
  GovernanceMaturityState,
  MaturityComponentScores,
  MaturityTrendPoint,
} from "@/app/types/governanceMaturity";
import type {
  GovernanceMaturitySnapshot,
  GovernanceMaturityState,
  MaturityTrendPoint,
} from "@/app/types/governanceMaturity";

const STATE_DIR = join(process.cwd(), "storage", "constitutional");
const STATE_FILE = join(STATE_DIR, "governance-maturity.json");

const DEFAULT_STATE: GovernanceMaturityState = {
  current: {
    score: 7,
    calculatedAt: new Date(0).toISOString(),
    components: { attestationQuality: 7, chaosResilience: 7, directivity: 7 },
    weights: { attestation: 0.4, chaos: 0.4, directivity: 0.2 },
    governanceDegradationActive: false,
    neutralizeMinChars: GOVERNANCE_NEUTRALIZE_MIN_NORMAL,
    sampleSizes: { resolutionsSampled: 0, chaosReportAvailable: false },
    notes: ["Initial baseline — awaiting first maturity calculation."],
  },
  trend: [],
};

function parseState(raw: unknown): GovernanceMaturityState | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (!o.current || typeof o.current !== "object") return null;
  const c = o.current as GovernanceMaturitySnapshot;
  if (typeof c.score !== "number") return null;
  return {
    current: c,
    trend: Array.isArray(o.trend) ? (o.trend as MaturityTrendPoint[]) : [],
  };
}

function readFileState(): GovernanceMaturityState {
  try {
    if (!existsSync(STATE_FILE)) return DEFAULT_STATE;
    return parseState(JSON.parse(readFileSync(STATE_FILE, "utf8"))) ?? DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

function writeFileState(state: GovernanceMaturityState): void {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

/** Sync read (file) for hot paths — API poll refreshes DB + file together. */
export function readGovernanceMaturityStateSync(): GovernanceMaturityState {
  return readFileState();
}

export async function readGovernanceMaturityState(): Promise<GovernanceMaturityState> {
  try {
    const row = await prisma.systemConfig.findUnique({
      where: { id: "global" },
      select: { governanceMaturity: true },
    });
    const parsed = parseState(row?.governanceMaturity ?? null);
    if (parsed) return parsed;
  } catch {
    /* column pending */
  }
  return readFileState();
}

export async function writeGovernanceMaturityState(state: GovernanceMaturityState): Promise<void> {
  writeFileState(state);
  try {
    await prisma.systemConfig.upsert({
      where: { id: "global" },
      create: {
        id: "global",
        governanceMaturity: state as unknown as Prisma.InputJsonValue,
      },
      update: {
        governanceMaturity: state as unknown as Prisma.InputJsonValue,
      },
    });
  } catch {
    /* file is authoritative fallback */
  }
}

export function clampMaturityScore(score: number): number {
  if (!Number.isFinite(score)) return GOVERNANCE_MATURITY_MIN;
  return Math.min(GOVERNANCE_MATURITY_MAX, Math.max(GOVERNANCE_MATURITY_MIN, score));
}

/** Neutralize / forensic justification length — Ironlock tightens to 100 chars when Stale Data mode is active. */
export function resolveNeutralizeMinChars(params: {
  governanceDegradationActive: boolean;
  staleDataLiveApiDown: boolean;
}): number {
  let min = params.governanceDegradationActive
    ? GOVERNANCE_NEUTRALIZE_MIN_DEGRADED
    : GOVERNANCE_NEUTRALIZE_MIN_NORMAL;
  if (params.staleDataLiveApiDown) {
    min = Math.max(min, IRONLOCK_STALE_DATA_FORENSIC_MIN_CHARS);
  }
  return min;
}

export function pruneTrendTo30Days(trend: MaturityTrendPoint[]): MaturityTrendPoint[] {
  const cutoff = Date.now() - GOVERNANCE_MATURITY_TREND_DAYS * 24 * 60 * 60 * 1000;
  const byDate = new Map<string, MaturityTrendPoint>();
  for (const p of trend) {
    const day = p.date.slice(0, 10);
    if (Date.parse(`${day}T00:00:00.000Z`) >= cutoff) {
      byDate.set(day, { ...p, date: day });
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
