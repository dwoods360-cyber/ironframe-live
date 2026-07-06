/**
 * Canonical GLOBAL_ADMIN identity for platform security operations.
 * Default: platform owner Supabase session (dwoods360@gmail.com).
 * Override via IRONFRAME_PLATFORM_GLOBAL_ADMIN_EMAIL only for non-prod drills.
 */

export const IRONFRAME_PLATFORM_GLOBAL_ADMIN_EMAIL =
  process.env.IRONFRAME_PLATFORM_GLOBAL_ADMIN_EMAIL?.trim().toLowerCase() ||
  "dwoods360@gmail.com";

export function normalizePlatformSecurityEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function isPlatformGlobalAdminEmail(email: string | null | undefined): boolean {
  const normalized = normalizePlatformSecurityEmail(email);
  if (!normalized) return false;
  return normalized === IRONFRAME_PLATFORM_GLOBAL_ADMIN_EMAIL;
}
