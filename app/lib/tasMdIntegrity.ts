import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

/** Absolute path to the canonical constitution (repo root). */
export function getTasMdAbsolutePath(): string {
  return join(process.cwd(), "docs", "TAS.md");
}

const GOLD_TAS_CANDIDATE_PATHS = [
  join(process.cwd(), "storage", "constitutional", "TAS.md.gold"),
  join(process.cwd(), "docs", "TAS.md.gold"),
] as const;

export type TasMdIntegrityFailureReason = "MISSING" | "UNREADABLE" | "EMPTY" | "INVALID_HASH";

export type TasMdIntegrityAssessment =
  | { ok: true; sha256: string }
  | { ok: false; reason: TasMdIntegrityFailureReason; message: string };

const SHA256_HEX_RE = /^[a-f0-9]{64}$/;

let devLoggedTasSha256: string | null = null;

function resolveGoldTasPath(): string | null {
  for (const candidate of GOLD_TAS_CANDIDATE_PATHS) {
    if (!existsSync(candidate)) continue;
    try {
      if (readFileSync(candidate).length > 0) return candidate;
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

function readNonEmptyFileSha256Hex(path: string): string | null {
  try {
    const buf = readFileSync(path);
    if (buf.length === 0) return null;
    const sha256 = createHash("sha256").update(buf).digest("hex");
    return SHA256_HEX_RE.test(sha256) ? sha256 : null;
  } catch {
    return null;
  }
}

function logDevTasIntegrityDigest(liveSha256: string, goldSha256: string | null): void {
  if (devLoggedTasSha256 === liveSha256) return;
  devLoggedTasSha256 = liveSha256;
  console.log(`[tasMdIntegrity][dev] docs/TAS.md SHA-256: ${liveSha256}`);
  if (goldSha256 && goldSha256 !== liveSha256) {
    console.log(
      `[tasMdIntegrity][dev] gold image SHA-256: ${goldSha256} (strict gold match skipped in development)`,
    );
  }
}

function isStrictTasGoldHashEnforced(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Non-throwing integrity gate for Ironlock constitutional emergency.
 * Synchronous — server actions / API routes only.
 *
 * Production: live `docs/TAS.md` must match `storage/constitutional/TAS.md.gold` when gold is present.
 * Development: file-existence + non-empty only; logs live (and drifted gold) SHA-256 to the terminal.
 */
export function assessTasMdIntegritySync(): TasMdIntegrityAssessment {
  const path = getTasMdAbsolutePath();
  if (!existsSync(path)) {
    return { ok: false, reason: "MISSING", message: "docs/TAS.md not found on disk" };
  }

  if (!isStrictTasGoldHashEnforced()) {
    const sha256 = readNonEmptyFileSha256Hex(path);
    if (!sha256) {
      return { ok: false, reason: "EMPTY", message: "docs/TAS.md is empty or unreadable" };
    }
    const goldPath = resolveGoldTasPath();
    const goldSha256 = goldPath ? readNonEmptyFileSha256Hex(goldPath) : null;
    logDevTasIntegrityDigest(sha256, goldSha256);
    return { ok: true, sha256 };
  }

  let buf: Buffer;
  try {
    buf = readFileSync(path);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "read failed";
    return { ok: false, reason: "UNREADABLE", message: msg };
  }
  if (buf.length === 0) {
    return { ok: false, reason: "EMPTY", message: "docs/TAS.md is empty" };
  }
  const sha256 = createHash("sha256").update(buf).digest("hex");
  if (!SHA256_HEX_RE.test(sha256)) {
    return { ok: false, reason: "INVALID_HASH", message: "SHA-256 digest failed validation" };
  }

  const goldPath = resolveGoldTasPath();
  const goldSha256 = goldPath ? readNonEmptyFileSha256Hex(goldPath) : null;
  if (goldSha256 && goldSha256 !== sha256) {
    return {
      ok: false,
      reason: "INVALID_HASH",
      message: "docs/TAS.md SHA-256 does not match constitutional gold image",
    };
  }

  return { ok: true, sha256 };
}

/**
 * SHA-256 over raw `docs/TAS.md` bytes (point-in-time integrity for attestations).
 * Synchronous read — call from server actions / API routes only.
 * @throws when {@link assessTasMdIntegritySync} would not return `ok: true`.
 */
export function computeTasMdSha256HexFromDiskSync(): string {
  const assessment = assessTasMdIntegritySync();
  if (!assessment.ok) {
    throw new Error(`TAS.md integrity failure (${assessment.reason}): ${assessment.message}`);
  }
  return assessment.sha256;
}
