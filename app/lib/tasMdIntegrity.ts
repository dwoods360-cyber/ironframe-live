import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

/** Absolute path to the canonical constitution (repo root). */
export function getTasMdAbsolutePath(): string {
  return join(process.cwd(), "docs", "TAS.md");
}

export type TasMdIntegrityFailureReason = "MISSING" | "UNREADABLE" | "EMPTY" | "INVALID_HASH";

export type TasMdIntegrityAssessment =
  | { ok: true; sha256: string }
  | { ok: false; reason: TasMdIntegrityFailureReason; message: string };

const SHA256_HEX_RE = /^[a-f0-9]{64}$/;

/**
 * Non-throwing integrity gate for Ironlock constitutional emergency.
 * Synchronous — server actions / API routes only.
 */
export function assessTasMdIntegritySync(): TasMdIntegrityAssessment {
  const path = getTasMdAbsolutePath();
  if (!existsSync(path)) {
    return { ok: false, reason: "MISSING", message: "docs/TAS.md not found on disk" };
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
