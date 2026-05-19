import "server-only";

import { createHash, randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";

export type ChaosRunScenario = "CONSTITUTIONAL_COLLAPSE" | "CHAOS_DRILL";

export type ChaosRunEventKind =
  | "RUN_STARTED"
  | "TAS_VOID"
  | "IRONLOCK_FREEZE"
  | "DMS_ARMED"
  | "LWT_SENT"
  | "DMS_TRIGGERED"
  | "SCORCH_COMPLETE"
  | "PHOENIX_RESURRECTION"
  | "RUN_CLOSED";

export type ChaosRunTelemetryEvent = {
  kind: ChaosRunEventKind;
  at: string;
  payload?: Record<string, unknown>;
};

export type ChaosRunTelemetryRecord = {
  runId: string;
  tenantId: string;
  scenario: ChaosRunScenario;
  isSimulation: boolean;
  startedAt: string;
  closedAt?: string;
  events: ChaosRunTelemetryEvent[];
};

const RUN_DIR = join(process.cwd(), "storage", "constitutional", "chaos-runs");
const ACTIVE_FILE = join(RUN_DIR, "_active-by-tenant.json");

function ensureDir(): void {
  if (!existsSync(RUN_DIR)) mkdirSync(RUN_DIR, { recursive: true });
}

function runPath(runId: string): string {
  return join(RUN_DIR, `${runId}.json`);
}

function readActiveMap(): Record<string, string> {
  ensureDir();
  try {
    if (!existsSync(ACTIVE_FILE)) return {};
    return JSON.parse(readFileSync(ACTIVE_FILE, "utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}

function writeActiveMap(map: Record<string, string>): void {
  ensureDir();
  writeFileSync(ACTIVE_FILE, JSON.stringify(map, null, 2), "utf8");
}

function readRun(runId: string): ChaosRunTelemetryRecord | null {
  try {
    const path = runPath(runId);
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8")) as ChaosRunTelemetryRecord;
  } catch {
    return null;
  }
}

function writeRun(record: ChaosRunTelemetryRecord): void {
  ensureDir();
  writeFileSync(runPath(record.runId), JSON.stringify(record, null, 2), "utf8");
}

export function beginChaosRunTelemetry(params: {
  tenantId: string;
  scenario: ChaosRunScenario;
  isSimulation?: boolean;
}): ChaosRunTelemetryRecord {
  const tenantId = params.tenantId.trim();
  const runId = randomUUID();
  const record: ChaosRunTelemetryRecord = {
    runId,
    tenantId,
    scenario: params.scenario,
    isSimulation: params.isSimulation !== false,
    startedAt: new Date().toISOString(),
    events: [{ kind: "RUN_STARTED", at: new Date().toISOString(), payload: { scenario: params.scenario } }],
  };
  writeRun(record);
  const active = readActiveMap();
  active[tenantId.toLowerCase()] = runId;
  writeActiveMap(active);
  return record;
}

export function appendChaosRunEvent(
  tenantId: string,
  kind: ChaosRunEventKind,
  payload?: Record<string, unknown>,
): ChaosRunTelemetryRecord | null {
  const tid = tenantId.trim().toLowerCase();
  const runId = readActiveMap()[tid];
  if (!runId) return null;
  const record = readRun(runId);
  if (!record) return null;
  record.events.push({ kind, at: new Date().toISOString(), payload });
  writeRun(record);
  return record;
}

export function closeChaosRunTelemetry(tenantId: string): ChaosRunTelemetryRecord | null {
  const tid = tenantId.trim().toLowerCase();
  const active = readActiveMap();
  const runId = active[tid];
  if (!runId) return null;
  const record = readRun(runId);
  if (!record) return null;
  record.closedAt = new Date().toISOString();
  record.events.push({ kind: "RUN_CLOSED", at: record.closedAt });
  writeRun(record);
  delete active[tid];
  writeActiveMap(active);
  return record;
}

export function getActiveChaosRunForTenant(tenantId: string): ChaosRunTelemetryRecord | null {
  const runId = readActiveMap()[tenantId.trim().toLowerCase()];
  return runId ? readRun(runId) : null;
}

export function getLatestClosedChaosRunForTenant(tenantId: string): ChaosRunTelemetryRecord | null {
  ensureDir();
  const tid = tenantId.trim().toLowerCase();
  const files = readdirSync(RUN_DIR).filter((f) => f.endsWith(".json") && f !== "_active-by-tenant.json");
  let latest: ChaosRunTelemetryRecord | null = null;
  for (const file of files) {
    try {
      const rec = JSON.parse(readFileSync(join(RUN_DIR, file), "utf8")) as ChaosRunTelemetryRecord;
      if (rec.tenantId.trim().toLowerCase() !== tid || !rec.closedAt) continue;
      if (!latest || Date.parse(rec.closedAt) > Date.parse(latest.closedAt!)) {
        latest = rec;
      }
    } catch {
      /* skip */
    }
  }
  return latest;
}

export function eventTimestamp(
  record: ChaosRunTelemetryRecord,
  kind: ChaosRunEventKind,
): number | null {
  const ev = record.events.find((e) => e.kind === kind);
  if (!ev) return null;
  const t = Date.parse(ev.at);
  return Number.isFinite(t) ? t : null;
}

export function telemetryRunFingerprint(record: ChaosRunTelemetryRecord): string {
  return createHash("sha256").update(JSON.stringify(record), "utf8").digest("hex");
}
