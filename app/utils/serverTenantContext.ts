import { cookies } from "next/headers";
import { TENANT_UUIDS, type TenantKey } from "@/app/utils/tenantIsolation";

const SLUGS = new Set<TenantKey>(["medshield", "vaultbank", "gridcore"]);

/** Default dev/sandbox tenant (see prisma seed); must resolve if cookie stores this UUID. */
const SANDBOX_TENANT_UUID = "00000000-0000-0000-0000-000000000000";

/** All tenant UUIDs we accept when the cookie stores a bare UUID instead of a slug. */
const KNOWN_TENANT_UUIDS = new Set<string>([
  ...Object.values(TENANT_UUIDS),
  SANDBOX_TENANT_UUID,
]);

/** UUID pattern for validating client-provided tenant IDs (matches platform tenant UUIDs). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves the active tenant UUID from the ironframe-tenant cookie (dashboard / clearance parity).
 * Accepts slug (medshield, …) or a known tenant UUID string.
 * Falls back to Medshield when the cookie is missing or unrecognized (same default as dashboard fetch).
 */
export async function getActiveTenantUuidFromCookies(): Promise<string> {
  const store = await cookies();
  const raw = store.get("ironframe-tenant")?.value?.trim().toLowerCase();
  if (raw && SLUGS.has(raw as TenantKey)) {
    return TENANT_UUIDS[raw as TenantKey];
  }
  if (raw && UUID_RE.test(raw) && KNOWN_TENANT_UUIDS.has(raw)) {
    return raw;
  }
  return TENANT_UUIDS.medshield;
}

export function isValidTenantUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

/** Map route slug (medshield, …) or pass through a bare UUID for DB columns that use `tenantId` @db.Uuid */
export function resolveTenantUuidFromSlugOrUuid(input: string): string {
  const s = input.trim().toLowerCase();
  if (s && SLUGS.has(s as TenantKey)) {
    return TENANT_UUIDS[s as TenantKey];
  }
  return input.trim();
}
