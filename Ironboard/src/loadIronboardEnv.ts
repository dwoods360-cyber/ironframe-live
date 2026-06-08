import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

/** IronBoard package root (Ironboard/), never the monorepo root. */
const IRONBOARD_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const isolated = {
  googleApiKey: '',
  port: '',
  geminiModel: '',
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

function absorbIronboardEnvFile(relativePath: string): void {
  const absolute = join(IRONBOARD_ROOT, relativePath);
  if (!existsSync(absolute)) return;
  const content = readFileSync(absolute, 'utf8');
  for (const line of content.split('\n')) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    const { key, value } = parsed;
    if (key === 'GOOGLE_API_KEY' || key === 'GEMINI_API_KEY') {
      if (value) isolated.googleApiKey = value;
    }
    if (key === 'IRONBOARD_PORT' && value) isolated.port = value;
    if (key === 'IRONBOARD_GEMINI_MODEL' && value) isolated.geminiModel = value;
  }
}

/**
 * Load credentials strictly from Ironboard/.env then Ironboard/.env.local.
 * Does not read repo-root .env — prevents architectural drift with :3000.
 */
export function loadIronboardEnv(): void {
  absorbIronboardEnvFile('.env');
  absorbIronboardEnvFile('.env.local');
}

/** API key from Ironboard-local env files, then hydrated process.env. */
export function getIronboardApiKey(): string | undefined {
  return (
    isolated.googleApiKey.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    undefined
  );
}

export function getIronboardPort(): number {
  const raw = isolated.port.trim() || '8081';
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 8081;
}

export function getIronboardGeminiModel(): string {
  return isolated.geminiModel.trim() || 'gemini-2.5-flash';
}
