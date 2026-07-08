import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SUCCESS_TEAM_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = join(SUCCESS_TEAM_ROOT, '..');

const isolated = {
  port: '',
  databaseUrl: '',
  ingressSecret: '',
  ingressBaseUrl: '',
  targetTenantSlug: '',
  pollIntervalMs: '',
  pollEnabled: '',
  aiEnabled: '',
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
    if (key === 'SUCCESS_TEAM_PORT') isolated.port = value;
    if (key === 'SUCCESS_TEAM_DATABASE_URL') isolated.databaseUrl = value;
    if (key === 'SUCCESS_TEAM_INGRESS_SECRET') isolated.ingressSecret = value;
    if (key === 'SUCCESS_TEAM_INGRESS_BASE_URL') isolated.ingressBaseUrl = value;
    if (key === 'SUCCESS_TEAM_TARGET_TENANT_SLUG') isolated.targetTenantSlug = value;
    if (key === 'SUCCESS_TEAM_POLL_INTERVAL_MS') isolated.pollIntervalMs = value;
    if (key === 'SUCCESS_TEAM_POLL_ENABLED') isolated.pollEnabled = value;
    if (key === 'SUCCESS_TEAM_AI_ENABLED') isolated.aiEnabled = value;
  }
}

function resolveWorkerDataDir(root: string): string {
  const configured = process.env.PERIMETER_WORKER_DATA_DIR?.trim();
  const dataDir = configured || join(root, 'data');
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  return dataDir;
}

function defaultDatabaseUrl(): string {
  const dbPath = join(resolveWorkerDataDir(SUCCESS_TEAM_ROOT), 'successteam.db').replace(/\\/g, '/');
  return `file:${dbPath}`;
}

function hydrateProcessEnv(): void {
  if (!process.env.SUCCESS_TEAM_DATABASE_URL?.trim()) {
    process.env.SUCCESS_TEAM_DATABASE_URL = isolated.databaseUrl || defaultDatabaseUrl();
  }
  if (isolated.ingressSecret) process.env.SUCCESS_TEAM_INGRESS_SECRET = isolated.ingressSecret;
  if (isolated.ingressBaseUrl) process.env.SUCCESS_TEAM_INGRESS_BASE_URL = isolated.ingressBaseUrl;
  if (isolated.targetTenantSlug) process.env.SUCCESS_TEAM_TARGET_TENANT_SLUG = isolated.targetTenantSlug;
}

/** Load SuccessTeam-local env — isolated from Ironframe runtime except ingress bearer. */
export function loadSuccessTeamEnv(): void {
  absorbEnvFile(join(SUCCESS_TEAM_ROOT, '.env.success'));
  absorbEnvFile(join(SUCCESS_TEAM_ROOT, '.env.local'));
  absorbEnvFile(join(REPO_ROOT, '.env.local'));
  absorbEnvFile(join(REPO_ROOT, '.env'));
  hydrateProcessEnv();
}

export function getSuccessTeamPort(): number {
  const cloudRun = process.env.PORT?.trim();
  if (cloudRun) {
    const cloud = Number.parseInt(cloudRun, 10);
    if (Number.isFinite(cloud) && cloud > 0) return cloud;
  }
  const raw = isolated.port.trim() || process.env.SUCCESS_TEAM_PORT?.trim() || '8085';
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 8085;
}

export function getIngressConfig(): {
  baseUrl: string;
  secret: string;
  targetTenantSlug: string;
} {
  const baseUrl =
    isolated.ingressBaseUrl.trim() ||
    process.env.SUCCESS_TEAM_INGRESS_BASE_URL?.trim() ||
    'http://127.0.0.1:3000';
  const secret =
    isolated.ingressSecret.trim() || process.env.SUCCESS_TEAM_INGRESS_SECRET?.trim() || '';
  const targetTenantSlug =
    isolated.targetTenantSlug.trim() ||
    process.env.SUCCESS_TEAM_TARGET_TENANT_SLUG?.trim() ||
    'bwc';
  return { baseUrl, secret, targetTenantSlug };
}

export function getPollIntervalMs(): number {
  const raw =
    isolated.pollIntervalMs.trim() || process.env.SUCCESS_TEAM_POLL_INTERVAL_MS?.trim() || '3600000';
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 60_000 ? n : 3_600_000;
}

export function isPollEnabled(): boolean {
  const raw =
    isolated.pollEnabled.trim() || process.env.SUCCESS_TEAM_POLL_ENABLED?.trim() || 'true';
  return raw === '1' || raw.toLowerCase() === 'true';
}

export function isAiNarrativeEnabled(): boolean {
  const raw =
    isolated.aiEnabled.trim() || process.env.SUCCESS_TEAM_AI_ENABLED?.trim() || 'false';
  return raw === '1' || raw.toLowerCase() === 'true';
}

export const SUCCESS_TEAM_ROOT_PATH = SUCCESS_TEAM_ROOT;
