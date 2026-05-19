import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const STATE_DIR = join(process.cwd(), "storage", "constitutional");
const STATE_FILE = join(STATE_DIR, "carbon-pulse-history.json");

export type CarbonIntensitySample = {
  at: string;
  zone: string;
  gco2PerKwh: number;
  mitigatedValueCents: string;
  dirty: boolean;
};

export type DirtyGridAlertRecord = {
  id: string;
  tenantId: string;
  sentAt: string;
  intensityGco2PerKwh: number;
  thresholdGco2PerKwh: number;
  tenantUsageKwh: number;
  usageBaselineKwh: number;
  message: string;
  acknowledged?: boolean;
  /** Canonical SHA-256 of throttling / dirty-window evidence (gavel anchor for Carbon ROI). */
  evidenceArtifactSha256?: string;
};

export type IronlockThrottleTenantRecord = {
  active: boolean;
  updatedAt: string;
  intensityGco2PerKwh: number;
  thresholdGco2PerKwh: number;
  autonomousMitigationEnabled: boolean;
  /** ISO timestamp of last AUTO_THROTTLE_ENGAGED audit (cool-down). */
  lastAutoThrottleAuditAt?: string;
};

export type CarbonPulseState = {
  samplesByTenant: Record<string, CarbonIntensitySample[]>;
  dirtyGridAlerts: DirtyGridAlertRecord[];
  lastDirtyAlertAtByTenant: Record<string, string>;
  /** Agent 6: background-agent throttle (dirty window + autonomous mitigation). */
  ironlockThrottleByTenant?: Record<string, IronlockThrottleTenantRecord>;
};

const MAX_SAMPLES_PER_TENANT = 96;

const DEFAULT_STATE: CarbonPulseState = {
  samplesByTenant: {},
  dirtyGridAlerts: [],
  lastDirtyAlertAtByTenant: {},
  ironlockThrottleByTenant: {},
};

function parseState(raw: unknown): CarbonPulseState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULT_STATE };
  const o = raw as CarbonPulseState & { ironlockThrottleByTenant?: unknown };
  const throttle =
    o.ironlockThrottleByTenant && typeof o.ironlockThrottleByTenant === "object" && !Array.isArray(o.ironlockThrottleByTenant)
      ? (o.ironlockThrottleByTenant as Record<string, IronlockThrottleTenantRecord>)
      : undefined;
  return {
    samplesByTenant: o.samplesByTenant ?? {},
    dirtyGridAlerts: Array.isArray(o.dirtyGridAlerts) ? o.dirtyGridAlerts : [],
    lastDirtyAlertAtByTenant: o.lastDirtyAlertAtByTenant ?? {},
    ironlockThrottleByTenant: throttle ?? {},
  };
}

export function readCarbonPulseStateSync(): CarbonPulseState {
  try {
    if (!existsSync(STATE_FILE)) return { ...DEFAULT_STATE };
    return parseState(JSON.parse(readFileSync(STATE_FILE, "utf8")));
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export async function readCarbonPulseState(): Promise<CarbonPulseState> {
  return readCarbonPulseStateSync();
}

export async function writeCarbonPulseState(next: CarbonPulseState): Promise<void> {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(next, null, 2), "utf8");
}

export function appendCarbonSample(
  state: CarbonPulseState,
  tenantId: string,
  sample: CarbonIntensitySample,
): CarbonPulseState {
  const prev = state.samplesByTenant[tenantId] ?? [];
  const next = [...prev, sample].slice(-MAX_SAMPLES_PER_TENANT);
  return {
    ...state,
    samplesByTenant: { ...state.samplesByTenant, [tenantId]: next },
  };
}

export function pruneSamplesOlderThan24h(samples: CarbonIntensitySample[]): CarbonIntensitySample[] {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return samples.filter((s) => Date.parse(s.at) >= cutoff);
}
