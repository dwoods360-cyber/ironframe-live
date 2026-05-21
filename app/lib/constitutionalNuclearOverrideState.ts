import "server-only";

import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

export type NuclearOverridePersistedState = {
  isOverrideSpent: boolean;
  spentAt: string | null;
  /** SHA-256 hex of master emergency seal at spend time — new seal generation resets one-time use. */
  spentSecretSha256: string | null;
  spentBy: string | null;
};

const STATE_DIR = join(process.cwd(), "storage", "constitutional");
const STATE_FILE = join(STATE_DIR, "nuclear-override-state.json");
const SEAL_META_FILE = join(STATE_DIR, "emergency-seal-meta.json");

export function readActiveMasterSealSha256(): string | null {
  try {
    if (!existsSync(SEAL_META_FILE)) return null;
    const raw = JSON.parse(readFileSync(SEAL_META_FILE, "utf8")) as { masterSha256?: string };
    return typeof raw.masterSha256 === "string" && /^[a-f0-9]{64}$/.test(raw.masterSha256)
      ? raw.masterSha256
      : null;
  } catch {
    return null;
  }
}

export function writeActiveMasterSealMeta(masterSha256: string): void {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(
    SEAL_META_FILE,
    JSON.stringify({ masterSha256, updatedAt: new Date().toISOString() }, null, 2),
    "utf8",
  );
}

function emptyState(): NuclearOverridePersistedState {
  return {
    isOverrideSpent: false,
    spentAt: null,
    spentSecretSha256: null,
    spentBy: null,
  };
}

function hashOverrideSecret(secret: string): string {
  return createHash("sha256").update(secret.trim().toLowerCase(), "utf8").digest("hex");
}

export function readNuclearOverrideState(): NuclearOverridePersistedState {
  try {
    if (!existsSync(STATE_FILE)) return emptyState();
    const raw = readFileSync(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<NuclearOverridePersistedState>;
    return {
      isOverrideSpent: Boolean(parsed.isOverrideSpent),
      spentAt: typeof parsed.spentAt === "string" ? parsed.spentAt : null,
      spentSecretSha256:
        typeof parsed.spentSecretSha256 === "string" ? parsed.spentSecretSha256 : null,
      spentBy: typeof parsed.spentBy === "string" ? parsed.spentBy : null,
    };
  } catch {
    return emptyState();
  }
}

function writeNuclearOverrideState(state: NuclearOverridePersistedState): void {
  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true });
  }
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

/** True when the active emergency seal master hash was already consumed (one-time nuclear key). */
export function isNuclearOverrideKeyExhausted(activeMasterSha256?: string | null): boolean {
  let anchor = activeMasterSha256?.trim() ?? null;
  if (!anchor) {
    anchor = readActiveMasterSealSha256();
  }
  if (!anchor) {
    const secret = process.env.CONSTITUTION_OVERRIDE_SECRET?.trim();
    if (!secret) return false;
    anchor = hashOverrideSecret(secret);
  }
  const state = readNuclearOverrideState();
  if (!state.isOverrideSpent || !state.spentSecretSha256) return false;
  return state.spentSecretSha256 === anchor;
}

export function markNuclearOverrideKeySpent(spentBy: string, masterSha256: string | null): void {
  const anchor =
    masterSha256?.trim() ||
    (process.env.CONSTITUTION_OVERRIDE_SECRET?.trim()
      ? hashOverrideSecret(process.env.CONSTITUTION_OVERRIDE_SECRET.trim())
      : null);
  writeNuclearOverrideState({
    isOverrideSpent: true,
    spentAt: new Date().toISOString(),
    spentSecretSha256: anchor,
    spentBy: spentBy.trim() || null,
  });
}

export function resetNuclearOverrideSpentState(): void {
  writeNuclearOverrideState(emptyState());
}

export const NUCLEAR_OVERRIDE_KEY_EXHAUSTED_MESSAGE =
  "CRITICAL: Emergency Key Exhausted. New key generation required via root deployment.";
