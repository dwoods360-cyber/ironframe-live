/**
 * Ironguard — effective Command Center / path / dev-override tenant for client fetches.
 * Kept in a module (not React state) so global fetch instrumentation can read it.
 */
import { writeIronframeTenantCookieToDocument } from "@/app/utils/clientTenantCookie";
import { tenantKeyFromUuid } from "@/app/utils/tenantIsolation";

let effectiveTenantUuid: string | null = null;
/** Server-resolved dashboard workspace when GLOBAL_ADMIN uses the aggregate global lane (no cookie). */
let dashboardWorkspaceFallbackTenantUuid: string | null = null;

export function setIronguardEffectiveTenant(uuid: string | null) {
  const t = uuid?.trim();
  const next = t && t.length > 0 ? t.toLowerCase() : null;
  if (next === effectiveTenantUuid) return;
  effectiveTenantUuid = next;
  if (typeof window !== "undefined" && next) {
    const cookieToken = tenantKeyFromUuid(next) ?? next;
    writeIronframeTenantCookieToDocument(cookieToken);
  }
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
