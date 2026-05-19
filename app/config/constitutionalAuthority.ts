/**
 * Human Root of Trust — workforce vs. system owner (override authority).
 * User_00 is the operational workforce; only SYSTEM_OWNER_ID may submit the override key.
 */

/** Canonical GRC workforce operator (acknowledge / neutralize / attestations). */
export const USER_00_WORKFORCE_ID = "User_00" as const;

/**
 * Human authority permitted to authorize constitutional emergency override.
 * Set `SYSTEM_OWNER_ID` to the Supabase user UUID or email of the platform owner.
 */
export const SYSTEM_OWNER_ID = (
  process.env.SYSTEM_OWNER_ID?.trim() || "SYSTEM_OWNER"
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
