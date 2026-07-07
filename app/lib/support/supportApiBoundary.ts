/** Shared tenant support API boundary — safe for client + server imports. */

export const TENANT_SUPPORT_API_PREFIXES = [
  "/api/support/in-tenant-ticket",
  "/api/support/in-tenant-context",
  "/api/support/tickets",
] as const;

export const FORBIDDEN_TENANT_SUPPORT_FETCH_PREFIXES = [
  "/api/admin/operations-hub",
  "/api/admin/approvals",
  "/api/v1/ingress/support-team",
  "/api/v1/ingress/salesteam",
  "/api/v1/ingress/success-team",
  "/api/v1/ingress/ironleads",
] as const;

export function isForbiddenTenantSupportFetchPath(pathname: string): boolean {
  const normalized = pathname.trim().toLowerCase();
  return FORBIDDEN_TENANT_SUPPORT_FETCH_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

export function assertTenantSupportFetchPath(pathname: string): void {
  if (isForbiddenTenantSupportFetchPath(pathname)) {
    throw new Error("Tenant support surface cannot call perimeter worker or operations APIs.");
  }
}
