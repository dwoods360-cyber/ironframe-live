import { TENANT_UUIDS, type TenantKey } from "@/app/utils/tenantIsolation";

const SLUGS = new Set<TenantKey>(["medshield", "vaultbank", "gridcore", "defense"]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Main Ops (`/`) has no path tenant; server actions use `ironframe-tenant` cookie.
 * Align dashboard fetch + Realtime allowlist with the same UUID the server uses.
 * Forensics: if bot ingest logs show a different tenant UUID than `resolveDashboardTenantUuid(...)`,
 * threats were persisted under another tenant scope (“shadow tenant”) — fix Dev Tenant Switcher / cookie before triage.
 * Returns **null** when no tenant is scoped (e.g. Global Command Center / no cookie) — no implicit Medshield default.
 */
export function resolveDashboardTenantUuid(pathTenantUuid: string | null): string | null {
  if (pathTenantUuid) return pathTenantUuid;
  if (typeof document === "undefined") return null;

  const raw = document.cookie
    .split("; ")
    .find((row) => row.startsWith("ironframe-tenant="))
    ?.split("=")[1]
    ?.trim()
    .toLowerCase();

  if (raw === "defense-logistics") {
    return TENANT_UUIDS.defense;
  }
  if (raw && SLUGS.has(raw as TenantKey)) {
    return TENANT_UUIDS[raw as TenantKey];
  }
  /** Any valid tenant UUID (including industrial seed tenants) — server validates on API/actions. */
  if (raw && UUID_RE.test(raw)) {
    return raw;
  }
  return null;
}
