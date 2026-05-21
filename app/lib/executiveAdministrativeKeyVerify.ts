import "server-only";

import { timingSafeEqual } from "crypto";
import {
  EXECUTIVE_ADMIN_ENV_KEYS,
  EXECUTIVE_ADMIN_KEY_LENGTH,
  EXECUTIVE_ROLES,
  type ExecutiveRole,
} from "@/app/config/executiveAdministrativeKeys";

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

function normalizeAdminKey(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (!new RegExp(`^[a-f0-9]{${EXECUTIVE_ADMIN_KEY_LENGTH}}$`).test(v)) return null;
  return v;
}

export function readConfiguredExecutiveKey(role: ExecutiveRole): string | null {
  const envName = EXECUTIVE_ADMIN_ENV_KEYS[role];
  return normalizeAdminKey(process.env[envName]);
}

export function verifyExecutiveAdministrativeKey(
  role: ExecutiveRole,
  submitted: string | null | undefined,
): boolean {
  const expected = readConfiguredExecutiveKey(role);
  const key = normalizeAdminKey(submitted);
  if (!expected || !key) return false;
  return timingSafeEqualHex(key, expected);
}

export function matchExecutiveRoleFromKey(
  submitted: string | null | undefined,
): ExecutiveRole | null {
  const key = normalizeAdminKey(submitted);
  if (!key) return null;
  for (const role of EXECUTIVE_ROLES) {
    if (verifyExecutiveAdministrativeKey(role, key)) return role;
  }
  return null;
}

export function assertTripleExecutiveKeysConfigured(): { ok: true } | { ok: false; error: string } {
  const missing = EXECUTIVE_ROLES.filter((r) => !readConfiguredExecutiveKey(r));
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Executive administrative keys not configured: ${missing.map((r) => EXECUTIVE_ADMIN_ENV_KEYS[r]).join(", ")}.`,
    };
  }
  return { ok: true };
}

export function verifyTripleExecutiveSubmission(keys: {
  ceoKey: string;
  cfoKey: string;
  cioKey: string;
}): { ok: true } | { ok: false; error: string } {
  const configured = assertTripleExecutiveKeysConfigured();
  if (!configured.ok) return configured;

  if (!verifyExecutiveAdministrativeKey("CEO", keys.ceoKey)) {
    return { ok: false, error: "Invalid CEO_KEY_AUTH." };
  }
  if (!verifyExecutiveAdministrativeKey("CFO", keys.cfoKey)) {
    return { ok: false, error: "Invalid CFO_KEY_AUTH." };
  }
  if (!verifyExecutiveAdministrativeKey("CIO", keys.cioKey)) {
    return { ok: false, error: "Invalid CIO_KEY_AUTH." };
  }

  const ceo = normalizeAdminKey(keys.ceoKey)!;
  const cfo = normalizeAdminKey(keys.cfoKey)!;
  const cio = normalizeAdminKey(keys.cioKey)!;
  if (ceo === cfo || ceo === cio || cfo === cio) {
    return { ok: false, error: "Executive keys must be distinct." };
  }
  return { ok: true };
}
