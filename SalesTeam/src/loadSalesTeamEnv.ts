import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SALESTEAM_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = join(SALESTEAM_ROOT, '..');

const isolated = {
  port: '',
  databaseUrl: '',
  ingressSecret: '',
  ingressBaseUrl: '',
  targetTenantSlug: '',
  pollIntervalMs: '',
  pollEnabled: '',
  defaultChannel: '',
  emailFrom: '',
  smsFrom: '',
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
    if (key === 'SALESTEAM_PORT') isolated.port = value;
    if (key === 'SALESTEAM_DATABASE_URL') isolated.databaseUrl = value;
    if (key === 'SALESTEAM_INGRESS_SECRET') isolated.ingressSecret = value;
    if (key === 'SALESTEAM_INGRESS_BASE_URL') isolated.ingressBaseUrl = value;
    if (key === 'SALESTEAM_TARGET_TENANT_SLUG') isolated.targetTenantSlug = value;
    if (key === 'SALESTEAM_POLL_INTERVAL_MS') isolated.pollIntervalMs = value;
    if (key === 'SALESTEAM_POLL_ENABLED') isolated.pollEnabled = value;
    if (key === 'SALESTEAM_DEFAULT_CHANNEL') isolated.defaultChannel = value;
    if (key === 'SALESTEAM_EMAIL_FROM') isolated.emailFrom = value;
    if (key === 'SALESTEAM_SMS_FROM') isolated.smsFrom = value;
  }
}

function defaultDatabaseUrl(): string {
  const dataDir = join(SALESTEAM_ROOT, 'data');
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  const dbPath = join(dataDir, 'salesteam.db').replace(/\\/g, '/');
  return `file:${dbPath}`;
}

function hydrateProcessEnv(): void {
  if (!process.env.SALESTEAM_DATABASE_URL?.trim()) {
    process.env.SALESTEAM_DATABASE_URL = isolated.databaseUrl || defaultDatabaseUrl();
  }
  if (isolated.ingressSecret) process.env.SALESTEAM_INGRESS_SECRET = isolated.ingressSecret;
  if (isolated.ingressBaseUrl) process.env.SALESTEAM_INGRESS_BASE_URL = isolated.ingressBaseUrl;
  if (isolated.targetTenantSlug) process.env.SALESTEAM_TARGET_TENANT_SLUG = isolated.targetTenantSlug;
}

/** Load SalesTeam-local env — isolated from Ironframe runtime except ingress bearer. */
export function loadSalesTeamEnv(): void {
  absorbEnvFile(join(SALESTEAM_ROOT, '.env.sales'));
  absorbEnvFile(join(SALESTEAM_ROOT, '.env.local'));
  absorbEnvFile(join(REPO_ROOT, '.env.local'));
  absorbEnvFile(join(REPO_ROOT, '.env'));
  hydrateProcessEnv();
}

export function getSalesTeamPort(): number {
  const cloudRun = process.env.PORT?.trim();
  if (cloudRun) {
    const cloud = Number.parseInt(cloudRun, 10);
    if (Number.isFinite(cloud) && cloud > 0) return cloud;
  }
  const raw = isolated.port.trim() || process.env.SALESTEAM_PORT?.trim() || '8084';
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 8084;
}

export function getIngressConfig(): {
  baseUrl: string;
  secret: string;
  targetTenantSlug: string;
} {
  const baseUrl =
    isolated.ingressBaseUrl.trim() ||
    process.env.SALESTEAM_INGRESS_BASE_URL?.trim() ||
    'http://127.0.0.1:3000';
  const secret =
    isolated.ingressSecret.trim() || process.env.SALESTEAM_INGRESS_SECRET?.trim() || '';
  const targetTenantSlug =
    isolated.targetTenantSlug.trim() ||
    process.env.SALESTEAM_TARGET_TENANT_SLUG?.trim() ||
    'medshield';
  return { baseUrl, secret, targetTenantSlug };
}

export function getPollIntervalMs(): number {
  const raw =
    isolated.pollIntervalMs.trim() || process.env.SALESTEAM_POLL_INTERVAL_MS?.trim() || '120000';
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 15_000 ? n : 120_000;
}

export function isPollEnabled(): boolean {
  const raw =
    isolated.pollEnabled.trim() || process.env.SALESTEAM_POLL_ENABLED?.trim() || 'true';
  return raw === '1' || raw.toLowerCase() === 'true';
}

export type OutreachChannel = 'EMAIL' | 'SMS';

export function getDefaultOutreachChannel(): OutreachChannel {
  const raw =
    isolated.defaultChannel.trim() || process.env.SALESTEAM_DEFAULT_CHANNEL?.trim() || 'EMAIL';
  return raw.toUpperCase() === 'SMS' ? 'SMS' : 'EMAIL';
}

export const SALESTEAM_ROOT_PATH = SALESTEAM_ROOT;
