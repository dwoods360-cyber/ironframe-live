import "server-only";

import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const EPIC_12_WORM_DELETE_BLOCK_MESSAGE =
  "EPIC_12_WORM_IMMUTABILITY_BLOCK: Object is sealed in a WORM evidence locker path; delete and overwrite are prohibited.";

/** First-segment prefixes permitted for append-only Supabase uploads (Epic 12). */
export const WORM_UPLOAD_ROOT_PREFIXES = [
  "worm",
  "incident-reports",
  "financial",
  "forensic",
] as const;

/** Supabase / local path prefixes that are write-once under Epic 12. */
const WORM_OBJECT_PREFIXES = [
  "worm/",
  "incident-reports/",
  "uploads/evidence/",
  "storage/worm/",
  "financial/",
  "forensic/",
] as const;

export type Epic12StorageConfig = {
  evidenceBucket: string;
  wormBucket: string;
  objectLockEnabled: boolean;
  strictMode: boolean;
};

export class WormStorageConfigError extends Error {
  constructor(detail: string) {
    super(`EPIC_12_WORM_CONFIG: ${detail}`);
    this.name = "WormStorageConfigError";
  }
}

export type ParsedStorageRef =
  | { kind: "supabase"; bucket: string; objectPath: string }
  | { kind: "local"; relative: string };

export function resolveEvidenceStorageBucket(): string {
  return (process.env.EVIDENCE_STORAGE_BUCKET ?? "evidence-locker").trim();
}

export function resolveWormStorageBucket(): string {
  return (process.env.EVIDENCE_WORM_BUCKET ?? `${resolveEvidenceStorageBucket()}-worm`).trim();
}

export function wormEnforcementEnabled(): boolean {
  const raw = process.env.EVIDENCE_WORM_OBJECT_LOCK?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off") return false;
  return true;
}

export function strictWormStorageConfig(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1" ||
    process.env.EVIDENCE_WORM_STRICT === "1"
  );
}

export function resolveEpic12StorageConfig(): Epic12StorageConfig {
  return {
    evidenceBucket: resolveEvidenceStorageBucket(),
    wormBucket: resolveWormStorageBucket(),
    objectLockEnabled: wormEnforcementEnabled(),
    strictMode: strictWormStorageConfig(),
  };
}

/** Fail-closed in production/Vercel when WORM object lock is explicitly disabled. */
export function assertEpic12WormStorageConfig(): void {
  if (!strictWormStorageConfig()) return;
  if (!wormEnforcementEnabled()) {
    throw new WormStorageConfigError(
      "EVIDENCE_WORM_OBJECT_LOCK must remain enabled in production — set to true or omit.",
    );
  }
  const bucket = resolveEvidenceStorageBucket();
  if (!bucket) {
    throw new WormStorageConfigError("EVIDENCE_STORAGE_BUCKET must be configured in production.");
  }
}

/** Supabase object keys must live under approved WORM root folders. */
export function isAllowedWormUploadObjectPath(objectPath: string): boolean {
  const normalized = objectPath.replace(/\\/g, "/").replace(/^\/+/, "").toLowerCase();
  const root = normalized.split("/")[0] ?? "";
  return (WORM_UPLOAD_ROOT_PREFIXES as readonly string[]).includes(root);
}

export function parseStorageRef(stored: string): ParsedStorageRef | null {
  const raw = stored?.trim();
  if (!raw) return null;

  if (raw.startsWith("supabase://")) {
    const rest = raw.slice("supabase://".length);
    const slash = rest.indexOf("/");
    if (slash <= 0) return null;
    return {
      kind: "supabase",
      bucket: rest.slice(0, slash),
      objectPath: rest.slice(slash + 1),
    };
  }

  return { kind: "local", relative: raw.replace(/\\/g, "/") };
}

function normalizedPathForPolicy(stored: string): string {
  const parsed = parseStorageRef(stored);
  if (!parsed) return stored.trim().toLowerCase();
  if (parsed.kind === "supabase") {
    return `${parsed.bucket}/${parsed.objectPath}`.toLowerCase();
  }
  return parsed.relative.toLowerCase();
}

/** True when the storage reference lives in a WORM-class prefix. */
export function isWormProtectedStoragePath(stored: string | null | undefined): boolean {
  if (!stored?.trim()) return false;
  const normalized = normalizedPathForPolicy(stored);
  return WORM_OBJECT_PREFIXES.some((prefix) => normalized.includes(prefix));
}

export function assertStorageDeletePermitted(
  stored: string | null | undefined,
): { ok: true } | { ok: false; error: string } {
  if (!wormEnforcementEnabled()) return { ok: true };
  if (isWormProtectedStoragePath(stored)) {
    return { ok: false, error: EPIC_12_WORM_DELETE_BLOCK_MESSAGE };
  }
  return { ok: true };
}

/** Alias — overwrite attempts on WORM paths are prohibited under the same contract. */
export function assertStorageOverwritePermitted(
  stored: string | null | undefined,
): { ok: true } | { ok: false; error: string } {
  return assertStorageDeletePermitted(stored);
}

/** Immutable upload contract for Supabase Storage (no overwrite). */
export function buildImmutableUploadOptions(mimeType: string): {
  upsert: false;
  cacheControl: string;
  contentType: string;
} {
  return {
    upsert: false,
    cacheControl: "public, max-age=31536000, immutable",
    contentType: mimeType || "application/octet-stream",
  };
}

/** Persist bytes to local WORM mirror (append-only directory tree). */
export async function writeLocalWormBytes(params: {
  relativeDir: string;
  fileName: string;
  bytes: Uint8Array;
}): Promise<string> {
  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const localRelative = path.join(params.relativeDir, safeName).replace(/\\/g, "/");
  const localAbsolute = path.join(process.cwd(), localRelative);
  await mkdir(path.dirname(localAbsolute), { recursive: true });
  await writeFile(localAbsolute, Buffer.from(params.bytes));
  return localRelative;
}
