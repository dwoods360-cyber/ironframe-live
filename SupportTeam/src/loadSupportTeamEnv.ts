import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SUPPORT_TEAM_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = join(SUPPORT_TEAM_ROOT, '..');

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
    if (key === 'SUPPORT_TEAM_PORT') isolated.port = value;
    if (key === 'SUPPORT_TEAM_DATABASE_URL') isolated.databaseUrl = value;
    if (key === 'SUPPORT_TEAM_INGRESS_SECRET') isolated.ingressSecret = value;
    if (key === 'SUPPORT_TEAM_INGRESS_BASE_URL') isolated.ingressBaseUrl = value;
    if (key === 'SUPPORT_TEAM_TARGET_TENANT_SLUG') isolated.targetTenantSlug = value;
    if (key === 'SUPPORT_TEAM_POLL_INTERVAL_MS') isolated.pollIntervalMs = value;
    if (key === 'SUPPORT_TEAM_POLL_ENABLED') isolated.pollEnabled = value;
    if (key === 'SUPPORT_TEAM_AI_ENABLED') isolated.aiEnabled = value;
  }
}

function defaultDatabaseUrl(): string {
  const dataDir = join(SUPPORT_TEAM_ROOT, 'data');
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  const dbPath = join(dataDir, 'supportteam.db').replace(/\\/g, '/');
  return `file:${dbPath}`;
}

function hydrateProcessEnv(): void {
  if (!process.env.SUPPORT_TEAM_DATABASE_URL?.trim()) {
    process.env.SUPPORT_TEAM_DATABASE_URL = isolated.databaseUrl || defaultDatabaseUrl();
  }
  if (isolated.ingressSecret) process.env.SUPPORT_TEAM_INGRESS_SECRET = isolated.ingressSecret;
  if (isolated.ingressBaseUrl) process.env.SUPPORT_TEAM_INGRESS_BASE_URL = isolated.ingressBaseUrl;
  if (isolated.targetTenantSlug) {
    process.env.SUPPORT_TEAM_TARGET_TENANT_SLUG = isolated.targetTenantSlug;
  }
}

export function loadSupportTeamEnv(): void {
  absorbEnvFile(join(SUPPORT_TEAM_ROOT, '.env.support'));
  absorbEnvFile(join(SUPPORT_TEAM_ROOT, '.env.local'));
  absorbEnvFile(join(REPO_ROOT, '.env.local'));
  absorbEnvFile(join(REPO_ROOT, '.env'));
  hydrateProcessEnv();
}

export function getSupportTeamPort(): number {
  const raw = isolated.port.trim() || process.env.SUPPORT_TEAM_PORT?.trim() || '8086';
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 8086;
}

export function getIngressConfig(): {
  baseUrl: string;
  secret: string;
  targetTenantSlug: string;
} {
  const baseUrl =
    isolated.ingressBaseUrl.trim() ||
    process.env.SUPPORT_TEAM_INGRESS_BASE_URL?.trim() ||
    'http://127.0.0.1:3000';
  const secret =
    isolated.ingressSecret.trim() || process.env.SUPPORT_TEAM_INGRESS_SECRET?.trim() || '';
  const targetTenantSlug =
    isolated.targetTenantSlug.trim() ||
    process.env.SUPPORT_TEAM_TARGET_TENANT_SLUG?.trim() ||
    'medshield';
  return { baseUrl, secret, targetTenantSlug };
}

export function getPollIntervalMs(): number {
  const raw =
    isolated.pollIntervalMs.trim() || process.env.SUPPORT_TEAM_POLL_INTERVAL_MS?.trim() || '90000';
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 30_000 ? n : 90_000;
}

export function isPollEnabled(): boolean {
  const raw =
    isolated.pollEnabled.trim() || process.env.SUPPORT_TEAM_POLL_ENABLED?.trim() || 'true';
  return raw === '1' || raw.toLowerCase() === 'true';
}

export function isAiNarrativeEnabled(): boolean {
  const raw =
    isolated.aiEnabled.trim() || process.env.SUPPORT_TEAM_AI_ENABLED?.trim() || 'false';
  return raw === '1' || raw.toLowerCase() === 'true';
}

export const SUPPORT_TEAM_ROOT_PATH = SUPPORT_TEAM_ROOT;
