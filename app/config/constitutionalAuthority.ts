/**
 * Human Root of Trust — workforce vs. system owner (override authority).
 * User_00 is the operational workforce; only SYSTEM_OWNER_ID may submit the override key.
 */

import { IRONFRAME_PLATFORM_GLOBAL_ADMIN_EMAIL } from "@/config/platformSecurity";

/** Canonical GRC workforce operator (acknowledge / neutralize / attestations). */
export const USER_00_WORKFORCE_ID = "User_00" as const;

/**
 * Human authority permitted to authorize constitutional emergency override.
 * Defaults to the platform GLOBAL_ADMIN email; override with SYSTEM_OWNER_ID env (UUID or email).
 */
export const SYSTEM_OWNER_ID = (
  process.env.SYSTEM_OWNER_ID?.trim() || IRONFRAME_PLATFORM_GLOBAL_ADMIN_EMAIL
).trim();

export type ConstitutionalOperatorAuthority = "workforce" | "system_owner";

export function resolveConstitutionalOperatorAuthority(
  operatorId: string | null | undefined,
): ConstitutionalOperatorAuthority {
  const id = (operatorId ?? "").trim();
  if (!id) return "workforce";
  if (id === SYSTEM_OWNER_ID) return "system_owner";
  if (id.toLowerCase() === SYSTEM_OWNER_ID.toLowerCase()) return "system_owner";
  return "workforce";
}

export function isSystemOwnerOperatorId(operatorId: string | null | undefined): boolean {
  return resolveConstitutionalOperatorAuthority(operatorId) === "system_owner";
}

export function isUser00WorkforceOperatorId(operatorId: string | null | undefined): boolean {
  const id = (operatorId ?? "").trim();
  return id === USER_00_WORKFORCE_ID || id.toLowerCase() === "user_00";
}
