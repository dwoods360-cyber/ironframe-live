/**
 * Global GRC routes live outside tenant enclaves (`/medshield`, etc.).
 * Tenant-prefixed checks from c160ce4 must not break these paths.
 */

export function isReportsAuditTrailPath(pathname: string): boolean {
  return pathname === "/reports/audit-trail" || pathname.startsWith("/reports/audit-trail/");
}

export function isLegacyAuditTrailRedirectPath(pathname: string): boolean {
  return pathname === "/audit-trail" || pathname.startsWith("/audit-trail/");
}
