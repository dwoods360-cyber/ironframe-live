import "server-only";

import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import {
  assertEpic12WormStorageConfig,
  assertStorageDeletePermitted,
  buildImmutableUploadOptions,
  isAllowedWormUploadObjectPath,
  resolveEvidenceStorageBucket,
  resolveWormStorageBucket,
  type ParsedStorageRef,
  parseStorageRef,
} from "@/app/lib/evidence/wormStoragePolicy";

export type WormUploadInput = {
  objectPath: string;
  bytes: Uint8Array;
  mimeType: string;
  /** Defaults to `EVIDENCE_STORAGE_BUCKET`; use `EVIDENCE_WORM_BUCKET` for dedicated WORM bucket. */
  bucket?: "primary" | "worm";
  /** Explicit bucket id override (e.g. `INCIDENT_REPORTS_BUCKET`). */
  bucketName?: string;
  tenantId?: string;
};

export type WormUploadResult =
  | { ok: true; storagePath: string; bucket: string; objectPath: string }
  | { ok: false; error: string };

function resolveUploadBucket(kind: WormUploadInput["bucket"]): string {
  return kind === "worm" ? resolveWormStorageBucket() : resolveEvidenceStorageBucket();
}

function normalizeObjectPath(objectPath: string): string {
  return objectPath.replace(/\\/g, "/").replace(/^\/+/, "");
}

/**
 * Epic 12 — append-only Supabase upload under WORM path prefixes (`upsert: false`).
 */
export async function uploadImmutableWormObject(
  input: WormUploadInput,
): Promise<WormUploadResult> {
  assertEpic12WormStorageConfig();

  const objectPath = normalizeObjectPath(input.objectPath);
  if (!isAllowedWormUploadObjectPath(objectPath)) {
    return {
      ok: false,
      error: `EPIC_12_WORM_PATH_REJECT: Object path must start with an approved WORM prefix (worm/, incident-reports/, financial/, forensic/). Got: ${objectPath}`,
    };
  }

  const bucket =
    input.bucketName?.trim() ||
    resolveUploadBucket(input.bucket);
  const mimeType = input.mimeType?.trim() || "application/octet-stream";

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.storage.from(bucket).upload(
      objectPath,
      input.bytes,
      buildImmutableUploadOptions(mimeType),
    );
    if (error) {
      return { ok: false, error: error.message };
    }

    console.info(
      "[epic12-worm-storage]",
      JSON.stringify({
        action: "IMMUTABLE_UPLOAD",
        bucket,
        objectPath,
        tenantId: input.tenantId ?? null,
        byteLength: input.bytes.byteLength,
      }),
    );

    return {
      ok: true,
      storagePath: `supabase://${bucket}/${objectPath}`,
      bucket,
      objectPath,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/**
 * Best-effort delete — no-op when WORM policy blocks mutation (logs + returns blocked flag).
 */
export async function removeStorageObjectIfPermitted(
  stored: string | null | undefined,
): Promise<{ removed: boolean; blocked: boolean; error?: string }> {
  const raw = stored?.trim();
  if (!raw) return { removed: false, blocked: false };

  const deletePermitted = assertStorageDeletePermitted(raw);
  if (!deletePermitted.ok) {
    console.warn("[epic12-worm-storage] delete blocked:", deletePermitted.error);
    return { removed: false, blocked: true, error: deletePermitted.error };
  }

  const parsed = parseStorageRef(raw);
  if (!parsed) return { removed: false, blocked: false };

  if (parsed.kind === "local") {
    try {
      const { unlink } = await import("fs/promises");
      const path = await import("path");
      const abs = path.join(process.cwd(), parsed.relative);
      await unlink(abs);
      return { removed: true, blocked: false };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { removed: false, blocked: false, error: message };
    }
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.storage
      .from(parsed.bucket)
      .remove([parsed.objectPath]);
    if (error) {
      return { removed: false, blocked: false, error: error.message };
    }
    return { removed: true, blocked: false };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { removed: false, blocked: false, error: message };
  }
}

export function parseSupabaseStorageRef(stored: string): ParsedStorageRef | null {
  return parseStorageRef(stored);
}
