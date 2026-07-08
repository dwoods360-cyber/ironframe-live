import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PROSPECT_POOL_TENANT_SLUG } from './lib/sectorTenantRouting.js';

const IRONLEADS_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = join(IRONLEADS_ROOT, '..');

const isolated = {
  port: '',
  databaseUrl: '',
  ingressSecret: '',
  ingressBaseUrl: '',
  targetTenantSlug: '',
  harvestCronEnabled: '',
  checkpointDatabaseUrl: '',
  failurePolicy: '',
};

function parseEnvLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const eq = trimmed.indexOf('=');
  if (eq <= 0) return null;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

function absorbEnvFile(absolutePath: string): void {
  if (!existsSync(absolutePath)) return;
  const content = readFileSync(absolutePath, 'utf8');
  for (const line of content.split('\n')) {
    const parsed = parseEnvLine(line);
    if (!parsed?.value) continue;
    const { key, value } = parsed;
    if (key === 'IRONLEADS_PORT') isolated.port = value;
    if (key === 'IRONLEADS_DATABASE_URL') isolated.databaseUrl = value;
    if (key === 'IRONLEADS_INGRESS_SECRET') isolated.ingressSecret = value;
    if (key === 'IRONLEADS_INGRESS_BASE_URL') isolated.ingressBaseUrl = value;
    if (key === 'IRONLEADS_TARGET_TENANT_SLUG') isolated.targetTenantSlug = value;
    if (key === 'IRONLEADS_HARVEST_CRON_ENABLED') isolated.harvestCronEnabled = value;
    if (key === 'IRONLEADS_CHECKPOINT_DATABASE_URL') isolated.checkpointDatabaseUrl = value;
    if (key === 'IRONLEADS_FAILURE_POLICY') isolated.failurePolicy = value;
  }
}

function resolveWorkerDataDir(root: string): string {
  const configured = process.env.PERIMETER_WORKER_DATA_DIR?.trim();
  const dataDir = configured || join(root, 'data');
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  return dataDir;
}

function defaultDatabaseUrl(): string {
  const dbPath = join(resolveWorkerDataDir(IRONLEADS_ROOT), 'ironleads.db').replace(/\\/g, '/');
  return `file:${dbPath}`;
}

function hydrateProcessEnv(): void {
  if (!process.env.IRONLEADS_DATABASE_URL?.trim()) {
    process.env.IRONLEADS_DATABASE_URL = isolated.databaseUrl || defaultDatabaseUrl();
  }
  if (isolated.ingressSecret) process.env.IRONLEADS_INGRESS_SECRET = isolated.ingressSecret;
  if (isolated.ingressBaseUrl) process.env.IRONLEADS_INGRESS_BASE_URL = isolated.ingressBaseUrl;
  if (isolated.targetTenantSlug) process.env.IRONLEADS_TARGET_TENANT_SLUG = isolated.targetTenantSlug;
}

/** Load Ironleads-local env — isolated from Ironframe runtime secrets except ingress bearer. */
export function loadIronleadsEnv(): void {
  absorbEnvFile(join(IRONLEADS_ROOT, '.env'));
  absorbEnvFile(join(IRONLEADS_ROOT, '.env.local'));
  absorbEnvFile(join(REPO_ROOT, '.env.local'));
  absorbEnvFile(join(REPO_ROOT, '.env'));
  hydrateProcessEnv();
}

export function getIronleadsPort(): number {
  const cloudRun = process.env.PORT?.trim();
  if (cloudRun) {
    const cloud = Number.parseInt(cloudRun, 10);
    if (Number.isFinite(cloud) && cloud > 0) return cloud;
  }
  const raw = isolated.port.trim() || process.env.IRONLEADS_PORT?.trim() || '8083';
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 8083;
}

export function getIronleadsDatabaseUrl(): string {
  return process.env.IRONLEADS_DATABASE_URL?.trim() || defaultDatabaseUrl();
}

function defaultCheckpointPath(): string {
  return join(resolveWorkerDataDir(IRONLEADS_ROOT), 'ironleads-checkpoints.db');
}

export function getIronleadsCheckpointPath(): string {
  const fromEnv =
    isolated.checkpointDatabaseUrl.trim() ||
    process.env.IRONLEADS_CHECKPOINT_DATABASE_URL?.trim();
  if (fromEnv) {
    if (fromEnv.startsWith('file:')) return fromEnv.slice('file:'.length);
    return fromEnv;
  }
  return defaultCheckpointPath();
}

export function getIngressConfig(): {
  baseUrl: string;
  secret: string;
  targetTenantSlug: string;
} {
  const baseUrl =
    isolated.ingressBaseUrl.trim() ||
    process.env.IRONLEADS_INGRESS_BASE_URL?.trim() ||
    'http://127.0.0.1:3000';
  const secret =
    isolated.ingressSecret.trim() || process.env.IRONLEADS_INGRESS_SECRET?.trim() || '';
  const targetTenantSlug =
    isolated.targetTenantSlug.trim() ||
    process.env.IRONLEADS_TARGET_TENANT_SLUG?.trim() ||
    PROSPECT_POOL_TENANT_SLUG;
  return { baseUrl, secret, targetTenantSlug };
}

export function isHarvestCronEnabled(): boolean {
  const raw =
    isolated.harvestCronEnabled.trim() ||
    process.env.IRONLEADS_HARVEST_CRON_ENABLED?.trim() ||
    'false';
  return raw === '1' || raw.toLowerCase() === 'true';
}

export type IronleadsFailurePolicy = 'quarantine' | 'freeze';

export function getIronleadsFailurePolicy(): IronleadsFailurePolicy {
  const raw =
    isolated.failurePolicy.trim() ||
    process.env.IRONLEADS_FAILURE_POLICY?.trim() ||
    'quarantine';
  return raw.toLowerCase() === 'freeze' ? 'freeze' : 'quarantine';
}

export function hashContent(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export const IRONLEADS_ROOT_PATH = IRONLEADS_ROOT;
