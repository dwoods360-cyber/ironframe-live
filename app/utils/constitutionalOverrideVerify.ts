import "server-only";

import { createHash, timingSafeEqual } from "crypto";
import {
  isNuclearOverrideKeyExhausted,
  NUCLEAR_OVERRIDE_KEY_EXHAUSTED_MESSAGE,
} from "@/app/lib/constitutionalNuclearOverrideState";
import {
  composeMasterSealFromSegments,
  getEmergencySealRecord,
  type EmergencySealSegments,
} from "@/app/lib/emergencySeal";
import {
  SECURITY_POSTURE_DUAL_LOCK,
  SECURITY_POSTURE_TRIPARTITE_LOCK,
} from "@/app/config/securityPosture";

export { NUCLEAR_OVERRIDE_KEY_EXHAUSTED_MESSAGE };

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a.trim().toLowerCase(), "utf8");
    const bb = Buffer.from(b.trim().toLowerCase(), "utf8");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

function segmentsMatchStored(
  submitted: EmergencySealSegments,
  stored: EmergencySealSegments,
  posture: typeof SECURITY_POSTURE_DUAL_LOCK | typeof SECURITY_POSTURE_TRIPARTITE_LOCK,
): boolean {
  if (!timingSafeEqualHex(submitted.vault, stored.vault)) return false;
  if (posture === SECURITY_POSTURE_DUAL_LOCK) {
    return timingSafeEqualHex(submitted.human ?? "", stored.human ?? "");
  }
  return (
    timingSafeEqualHex(submitted.ciso ?? "", stored.ciso ?? "") &&
    timingSafeEqualHex(submitted.staff ?? "", stored.staff ?? "")
  );
}

/**
 * Verify segmented override keys against SystemConfig emergency seal (preferred)
 * or legacy `CONSTITUTION_OVERRIDE_SECRET` full 64-hex env.
 */
export async function verifyConstitutionalOverrideKeyParts(
  parts: EmergencySealSegments,
): Promise<{ ok: true; masterSha256: string } | { ok: false; error: string }> {
  const seal = await getEmergencySealRecord();
  if (seal) {
    if (isNuclearOverrideKeyExhausted(seal.masterSha256)) {
      return { ok: false, error: NUCLEAR_OVERRIDE_KEY_EXHAUSTED_MESSAGE };
    }
    if (!segmentsMatchStored(parts, seal.segments, seal.posture)) {
      return { ok: false, error: "Invalid override key segment(s)." };
    }
    const composed = composeMasterSealFromSegments(seal.posture, parts);
    if (!composed) {
      return { ok: false, error: "Invalid override key format." };
    }
    return { ok: true, masterSha256: seal.masterSha256 };
  }

  const secret = process.env.CONSTITUTION_OVERRIDE_SECRET?.trim().toLowerCase();
  if (!secret || !/^[a-f0-9]{64}$/.test(secret)) {
    return { ok: false, error: "Emergency seal not configured." };
  }
  if (isNuclearOverrideKeyExhausted(hashOverrideSecret(secret))) {
    return { ok: false, error: NUCLEAR_OVERRIDE_KEY_EXHAUSTED_MESSAGE };
  }
  const vault = (parts.vault ?? "").trim().toLowerCase();
  const human = (parts.human ?? "").trim().toLowerCase();
  const composed = `${vault}${human}`;
  if (composed.length !== 64 || !timingSafeEqualHex(composed, secret)) {
    return { ok: false, error: "Invalid override key." };
  }
  return { ok: true, masterSha256: hashOverrideSecret(secret) };
}

function hashOverrideSecret(secret: string): string {
  return createHash("sha256").update(secret.trim().toLowerCase(), "utf8").digest("hex");
}

/** Legacy single-field 64-hex submission. */
export async function verifyConstitutionalOverrideKey(
  submitted: string | null | undefined,
): Promise<{ ok: true; masterSha256: string } | { ok: false; error: string }> {
  const key = (submitted ?? "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(key)) {
    return { ok: false, error: "Invalid override key." };
  }
  const seal = await getEmergencySealRecord();
  if (seal) {
    const composed = composeMasterSealFromSegments(seal.posture, seal.segments);
    if (!composed || !timingSafeEqualHex(key, composed)) {
      return { ok: false, error: "Invalid override key." };
    }
    if (isNuclearOverrideKeyExhausted(seal.masterSha256)) {
      return { ok: false, error: NUCLEAR_OVERRIDE_KEY_EXHAUSTED_MESSAGE };
    }
    return { ok: true, masterSha256: seal.masterSha256 };
  }
  const secret = process.env.CONSTITUTION_OVERRIDE_SECRET?.trim().toLowerCase();
  if (!secret || !timingSafeEqualHex(key, secret)) {
    return { ok: false, error: "Invalid override key." };
  }
  const masterSha256 = hashOverrideSecret(secret);
  if (isNuclearOverrideKeyExhausted(masterSha256)) {
    return { ok: false, error: NUCLEAR_OVERRIDE_KEY_EXHAUSTED_MESSAGE };
  }
  return { ok: true, masterSha256 };
}
