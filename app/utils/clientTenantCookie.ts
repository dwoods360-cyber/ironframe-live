import { TENANT_UUIDS, type TenantKey } from "@/app/utils/tenantIsolation";

const SLUGS = new Set<TenantKey>(["medshield", "vaultbank", "gridcore"]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Mirrors `serverTenantContext` (sandbox seed tenant). */
const SANDBOX_TENANT_UUID = "00000000-0000-0000-0000-000000000000";

const KNOWN_UUIDS = new Set<string>([...Object.values(TENANT_UUIDS), SANDBOX_TENANT_UUID]);

/**
 * Main Ops (`/`) has no path tenant; server actions use `ironframe-tenant` cookie.
 * Align dashboard fetch + Realtime allowlist with the same UUID the server uses.
 */
export function resolveDashboardTenantUuid(pathTenantUuid: string | null): string {
  if (pathTenantUuid) return pathTenantUuid;
  if (typeof document === "undefined") return TENANT_UUIDS.medshield;

  const raw = document.cookie
    .split("; ")
    .find((row) => row.startsWith("ironframe-tenant="))
    ?.split("=")[1]
    ?.trim()
    .toLowerCase();

  if (raw && SLUGS.has(raw as TenantKey)) {
    return TENANT_UUIDS[raw as TenantKey];
  }
  if (raw && UUID_RE.test(raw) && KNOWN_UUIDS.has(raw)) {
    return raw;
  }
  return TENANT_UUIDS.medshield;
}
