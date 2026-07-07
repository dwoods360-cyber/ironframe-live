import { cookies, headers } from "next/headers";
import prisma from "@/lib/prisma";
import { IRONFRAME_HOST_TENANT_SLUG_HEADER, IRONFRAME_HOST_TENANT_UUID_HEADER, tenantSlugFromHost } from "@/app/lib/tenantSubdomain";
import { lookupTenantBySlug } from "@/app/lib/tenantSlugRegistry";
import { readSimulationModeCookieEnabled } from "@/app/utils/simulationModeCookieServer";
import { isShadowPlaneActiveFromEnv } from "@/app/utils/shadowPlaneActive";
import { TENANT_UUIDS, type TenantKey } from "@/app/utils/tenantIsolation";

const SLUGS = new Set<TenantKey>(["medshield", "vaultbank", "gridcore", "defense"]);

/** Default dev/sandbox tenant (see prisma seed); must resolve if cookie stores this UUID. */
const SANDBOX_TENANT_UUID = "00000000-0000-0000-0000-000000000000";

/** Legacy known UUIDs (fast path before DB lookup). */
const KNOWN_TENANT_UUIDS = new Set<string>([
  ...Object.values(TENANT_UUIDS),
  SANDBOX_TENANT_UUID,
]);

/** UUID pattern for validating client-provided tenant IDs (matches platform tenant UUIDs). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveTenantUuidFromIronframeCookieRaw(
  rawFull: string | undefined,
): Promise<string | null> {
  if (!rawFull) return null;
  const rawLower = rawFull.toLowerCase();

  if (SLUGS.has(rawLower as TenantKey)) {
    return TENANT_UUIDS[rawLower as TenantKey];
  }

  if (UUID_RE.test(rawFull)) {
    if (KNOWN_TENANT_UUIDS.has(rawFull)) {
      return rawFull;
    }
    const tenantById = await prisma.tenant.findUnique({
      where: { id: rawFull },
      select: { id: true },
    });
    if (tenantById) {
      return tenantById.id;
    }
    return null;
  }

  const tenantBySlug = await prisma.tenant.findUnique({
    where: { slug: rawLower },
    select: { id: true },
  });
  return tenantBySlug?.id ?? null;
}

/** Host-bound tenant UUID from subdomain middleware or request host slug. */
export async function getHostBoundTenantUuid(): Promise<string | null> {
  const h = await headers();
  const rawUuid = h.get(IRONFRAME_HOST_TENANT_UUID_HEADER)?.trim();
  if (rawUuid && isValidTenantUuid(rawUuid)) return rawUuid;

  const slug =
    h.get(IRONFRAME_HOST_TENANT_SLUG_HEADER)?.trim() ||
    tenantSlugFromHost(h.get("host")) ||
    null;
  if (!slug) return null;

  try {
    const tenant = await lookupTenantBySlug(slug);
    return tenant?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Command Center cookie scope only — **null** when Global Aggregate (no `ironframe-tenant` cookie).
 * Subdomain host binding takes precedence when present.
 */
export async function getScopedTenantUuidFromCookies(): Promise<string | null> {
  const hostBound = await getHostBoundTenantUuid();
  if (hostBound) return hostBound;

  const store = await cookies();
  const rawFull = store.get("ironframe-tenant")?.value?.trim();
  return resolveTenantUuidFromIronframeCookieRaw(rawFull);
}

/**
 * Red-team / chaos server actions: explicit tenant cookie, else shadow-plane simulation default.
 */
export async function getRedTeamSimulationTenantUuid(): Promise<string | null> {
  const scoped = await getScopedTenantUuidFromCookies();
  if (scoped) return scoped;
  if (isShadowPlaneActiveFromEnv() || (await readSimulationModeCookieEnabled())) {
    return TENANT_UUIDS.medshield;
  }
  return null;
}

/**
 * Resolves the active tenant UUID from the ironframe-tenant cookie (dashboard / clearance parity).
 * Accepts slug (medshield, …) or a known tenant UUID string.
 * When cookie is missing, uses first RBAC assignment for authenticated sessions before Medshield default.
 */
export async function getActiveTenantUuidFromCookies(): Promise<string> {
  const scoped = await getScopedTenantUuidFromCookies();
  if (scoped) return scoped;

  const { resolveDashboardActiveTenantUuid } = await import(
    "@/app/lib/auth/resolveDashboardActiveTenant"
  );
  return resolveDashboardActiveTenantUuid();
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

/**
 * Resolves UI / cookie / client payload tenant identifiers to the canonical **UUID** in `tenants.id`.
 * Use for Prisma `tenantId` filters (SimThreatEvent, Company, …) — never query with a bare slug.
 */
export async function resolveTenantUuidForThreatScope(rawInput: string): Promise<string | null> {
  const raw = rawInput.trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();

  if (SLUGS.has(lower as TenantKey)) {
    return TENANT_UUIDS[lower as TenantKey];
  }

  const orFilters: Array<{ id: string } | { slug: string }> = [{ slug: lower }];
  if (UUID_RE.test(raw)) {
    orFilters.unshift({ id: raw });
  }

  const row = await prisma.tenant.findFirst({
    where: { OR: orFilters },
    select: { id: true },
  });
  return row?.id ?? null;
}
