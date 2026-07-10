/**
 * Ironguard — effective Command Center / path / dev-override tenant for client fetches.
 * Kept in a module (not React state) so global fetch instrumentation can read it.
 */
let effectiveTenantUuid: string | null = null;
/** Server-resolved dashboard workspace when GLOBAL_ADMIN uses the aggregate global lane (no cookie). */
let dashboardWorkspaceFallbackTenantUuid: string | null = null;

export function setIronguardEffectiveTenant(uuid: string | null) {
  const t = uuid?.trim();
  effectiveTenantUuid = t && t.length > 0 ? t.toLowerCase() : null;
}

export function getIronguardEffectiveTenant(): string | null {
  return effectiveTenantUuid;
}

export function setDashboardWorkspaceFallbackTenant(uuid: string | null) {
  const t = uuid?.trim();
  dashboardWorkspaceFallbackTenantUuid = t && t.length > 0 ? t.toLowerCase() : null;
}

export function getDashboardWorkspaceFallbackTenant(): string | null {
  return dashboardWorkspaceFallbackTenantUuid;
}
