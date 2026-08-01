import {
  DEMO_BEACHHEAD_TENANT_SLUGS,
  isDemoBeachheadTenantSlug,
  isProductionDemoBeachheadFilterActive,
} from "@/app/lib/demoBeachheadTenantGate";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";

/**
 * Production Command Center switcher: only live Primaries and their Subtenant
 * Enclaves. Local / preview (`VERCEL_ENV` unset or not `production`) keeps the
 * full catalog for GLOBAL_ADMIN — including beachheads and platform fixtures.
 *
 * Opt back in on production: `IRONFRAME_SHOW_DEMO_BEACHHEAD_TENANTS=1`.
 * Force locally: `IRONFRAME_FORCE_PRODUCTION_TENANT_FILTER=1`.
 */

/** Platform / seed / industrial / QA fixtures that must never appear on apex prod. */
export const NON_LIVE_PLATFORM_TENANT_SLUGS = [
  ...DEMO_BEACHHEAD_TENANT_SLUGS,
  "prospect-pool",
  "ironframe-sandbox",
  "ironframe-central-test",
  "stripe-e2e-corp",
  "stripe-act-b1",
  "defense-logistics",
  "fedsecure",
  "horizon-aero",
  "metro-municipal",
  "global-civic",
  "cybercore",
  "defense",
] as const;

const NON_LIVE_PLATFORM_SLUG_SET = new Set<string>(NON_LIVE_PLATFORM_TENANT_SLUGS);

/** Known fixture UUIDs for sticky-cookie stripping on production apex. */
export const NON_LIVE_PLATFORM_TENANT_IDS = new Set<string>([
  TENANT_UUIDS.medshield,
  TENANT_UUIDS.vaultbank,
  TENANT_UUIDS.gridcore,
  TENANT_UUIDS.defense,
  "11111111-1111-4111-8111-111111111111", // prospect-pool (seed)
  "00000000-0000-0000-0000-000000000000", // ironframe-sandbox (seed)
].map((id) => id.toLowerCase()));

/** Same activation gate as the beachhead filter (VERCEL_ENV=production). */
export const isProductionTenantSwitcherFilterActive = isProductionDemoBeachheadFilterActive;

const EPHEMERAL_TEST_SLUG_RE =
  /^(a2-dryrun-|stripe-act-|stripe-e2e-)|(-e2e-corp|-dryrun-|-throwaway-)|(^test-)|(-test$)|(^qa-)|sandbox/i;

const NON_LIVE_NAME_RE =
  /^\[QA THROWAWAY\]|GOLDEN PATH TEST|TEST PROTOCOL|ACTIVATION TEST CORP|\bE2E CORP\b/i;

export function isNonLivePlatformTenantSlug(slug: string | null | undefined): boolean {
  if (!slug?.trim()) return false;
  const normalized = slug.trim().toLowerCase();
  if (NON_LIVE_PLATFORM_SLUG_SET.has(normalized)) return true;
  if (isDemoBeachheadTenantSlug(normalized)) return true;
  return EPHEMERAL_TEST_SLUG_RE.test(normalized);
}

export function isNonLivePlatformTenantId(id: string | null | undefined): boolean {
  if (!id?.trim()) return false;
  return NON_LIVE_PLATFORM_TENANT_IDS.has(id.trim().toLowerCase());
}

export function isNonLivePlatformTenantRow(row: {
  slug: string;
  name?: string | null;
}): boolean {
  if (isNonLivePlatformTenantSlug(row.slug)) return true;
  const name = row.name?.trim() ?? "";
  return Boolean(name) && NON_LIVE_NAME_RE.test(name);
}

export type SwitcherTenantFilterRow = {
  slug: string;
  id?: string;
  name?: string | null;
  parentTenantId?: string | null;
  enclaveRole?: string | null;
};

/**
 * Hide non-live platform / demo / QA rows on production apex.
 * Host-bound subdomain workspaces keep their own row. Assignment does not override.
 * Subtenants of filtered parents are also removed.
 */
export function filterNonLivePlatformTenants<T extends SwitcherTenantFilterRow>(
  rows: T[],
  _assignedTenantIds: readonly string[] = [],
  options?: { hostTenantId?: string | null },
): T[] {
  if (!isProductionTenantSwitcherFilterActive()) return rows;

  const hostId = options?.hostTenantId?.trim().toLowerCase() || "";

  const directlyHiddenIds = new Set<string>();
  for (const row of rows) {
    const rowId = row.id?.trim().toLowerCase() || "";
    if (hostId && rowId === hostId) continue;
    if (isNonLivePlatformTenantRow(row) || (rowId && isNonLivePlatformTenantId(rowId))) {
      if (rowId) directlyHiddenIds.add(rowId);
    }
  }

  // Drop Subtenant Enclaves whose Primary was filtered (or is a known non-live id).
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of rows) {
      const rowId = row.id?.trim().toLowerCase() || "";
      if (!rowId || directlyHiddenIds.has(rowId)) continue;
      if (hostId && rowId === hostId) continue;
      const parentId = row.parentTenantId?.trim().toLowerCase() || "";
      if (
        parentId &&
        (directlyHiddenIds.has(parentId) || isNonLivePlatformTenantId(parentId))
      ) {
        directlyHiddenIds.add(rowId);
        changed = true;
      }
    }
  }

  return rows.filter((row) => {
    const rowId = row.id?.trim().toLowerCase() || "";
    if (hostId && rowId === hostId) return true;
    if (rowId && directlyHiddenIds.has(rowId)) return false;
    if (isNonLivePlatformTenantRow(row)) return false;
    return true;
  });
}
