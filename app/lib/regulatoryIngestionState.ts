import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type {
  CisoDriftNotification,
  IngestedRegulationRecord,
  RegulatoryComparisonSnapshot,
} from "@/app/types/regulatoryIngestion";

const STATE_DIR = join(process.cwd(), "storage", "constitutional");
const STATE_FILE = join(STATE_DIR, "regulatory-ingestion.json");
const INBOX_DIR = join(process.cwd(), "storage", "regulatory-vault", "inbox");
const SEEN_FILE = join(STATE_DIR, "industry-scout-seen.json");

export type RegulatoryIngestionState = {
  regulations: IngestedRegulationRecord[];
  latestComparison: RegulatoryComparisonSnapshot | null;
  cisoNotifications: CisoDriftNotification[];
  lastScoutRunAt: string | null;
};

const DEFAULT_STATE: RegulatoryIngestionState = {
  regulations: [],
  latestComparison: null,
  cisoNotifications: [],
  lastScoutRunAt: null,
};

export function ensureRegulatoryInboxDir(): string {
  if (!existsSync(INBOX_DIR)) mkdirSync(INBOX_DIR, { recursive: true });
  return INBOX_DIR;
}

export function readRegulatoryIngestionStateSync(): RegulatoryIngestionState {
  try {
    if (!existsSync(STATE_FILE)) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...(JSON.parse(readFileSync(STATE_FILE, "utf8")) as RegulatoryIngestionState) };
  } catch {
    return DEFAULT_STATE;
  }
}

export async function readRegulatoryIngestionState(): Promise<RegulatoryIngestionState> {
  return readRegulatoryIngestionStateSync();
}

export async function writeRegulatoryIngestionState(state: RegulatoryIngestionState): Promise<void> {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(
    STATE_FILE,
    JSON.stringify(
      {
        ...state,
        regulations: state.regulations.slice(0, 100),
        cisoNotifications: state.cisoNotifications.slice(0, 50),
      },
      null,
      2,
    ),
    "utf8",
  );
}

export function readIndustryScoutSeenIds(): Set<string> {
  try {
    if (!existsSync(SEEN_FILE)) return new Set();
    const raw = JSON.parse(readFileSync(SEEN_FILE, "utf8")) as { ids?: string[] };
    return new Set(raw.ids ?? []);
  } catch {
    return new Set();
  }
}

export function writeIndustryScoutSeenIds(ids: Set<string>): void {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(SEEN_FILE, JSON.stringify({ ids: [...ids].slice(-500) }, null, 2), "utf8");
}
