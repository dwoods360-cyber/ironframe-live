import "server-only";

import prisma from "@/lib/prisma";
import { tenantKeyFromUuid } from "@/app/utils/tenantIsolation";
import { isValidTenantUuid } from "@/app/utils/serverTenantContext";

export const IRONFRAME_TENANT_COOKIE = "ironframe-tenant";
const TENANT_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

/** Cookie token: canonical slug when known, otherwise validated tenant UUID. */
export async function tenantCookieValueForUuid(tenantUuid: string): Promise<string> {
  const uuid = tenantUuid.trim();
  if (!isValidTenantUuid(uuid)) {
    return uuid;
  }
  const slug = tenantKeyFromUuid(uuid);
  if (slug) {
    return slug;
  }
  const row = await prisma.tenant.findUnique({
    where: { id: uuid },
    select: { slug: true },
  });
  return row?.slug?.trim() || uuid;
}

/** Persist scoped workspace on a Route Handler response (RSC layouts cannot set cookies). */
export function applyDashboardTenantSessionCookieOnResponse(
  response: { cookies: { set: (name: string, value: string, options?: Record<string, unknown>) => void } },
  tenantUuid: string,
  token: string,
): void {
  if (!isValidTenantUuid(tenantUuid)) {
    return;
  }
  response.cookies.set(IRONFRAME_TENANT_COOKIE, token, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TENANT_COOKIE_MAX_AGE,
  });
}

/** @deprecated Use Route Handler response cookies or DashboardGroupShell client hydration. */
export async function applyDashboardTenantSessionCookie(tenantUuid: string): Promise<void> {
  if (!isValidTenantUuid(tenantUuid)) {
    return;
  }
  // Next.js forbids cookies().set() outside Server Actions / Route Handlers.
  // Callers in RSC should pass initialTenantUuid to DashboardGroupShell instead.
}
