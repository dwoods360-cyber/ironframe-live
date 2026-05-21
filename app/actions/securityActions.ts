"use server";

import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import {
  resetQuarantineIdentifierInternal,
  type ResetQuarantineResult,
} from "@/app/lib/security/quarantineLedgerGuard";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Normalize operator input: `ip:…`, `user:<uuid>`, raw IP, or raw UUID. */
export function normalizeQuarantineIdentifierInput(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (t.startsWith("ip:") || t.startsWith("user:")) return t.slice(0, 512);
  if (UUID_RE.test(t)) return `user:${t}`;
  return `ip:${t}`.slice(0, 512);
}

/**
 * Gavel — probation / governed quarantine reset: clears probation hold (and hard ban when Irontally certifies);
 * preserves offense_count; requires forensic rationale (≥50 chars) and Annex A.5 narrative for strike-tier rows.
 */
export async function resetQuarantineIdentifier(
  identifier: string,
  rationale: string,
): Promise<ResetQuarantineResult> {
  const user = await getSupabaseSessionUser();
  if (!user?.id?.trim()) {
    return { ok: false, error: "Unauthorized." };
  }
  const id = normalizeQuarantineIdentifierInput(identifier);
  return resetQuarantineIdentifierInternal(id, user.id.trim(), rationale);
}
