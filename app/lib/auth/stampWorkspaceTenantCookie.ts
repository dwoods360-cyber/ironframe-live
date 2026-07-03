import "server-only";

import { cookies } from "next/headers";

import { lookupTenantBySlug } from "@/app/lib/tenantSlugRegistry";
import { tenantUuidFromSlug } from "@/app/lib/tenantSubdomain";

const IRONFRAME_TENANT_COOKIE = "ironframe-tenant";
const SIMULATION_MODE_COOKIE = "ironframe-simulation-mode";
const TENANT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Binds the active workspace cookie after corporate invite activation. */
export async function stampWorkspaceTenantCookie(tenantSlug: string): Promise<void> {
  const slug = tenantSlug.trim().toLowerCase();
  if (!slug) return;

  const tenant = await lookupTenantBySlug(slug);
  const cookieUuid = tenant?.id ?? tenantUuidFromSlug(slug);
  if (!cookieUuid) return;

  const store = await cookies();
  store.set(IRONFRAME_TENANT_COOKIE, cookieUuid, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TENANT_COOKIE_MAX_AGE,
  });
  store.set(SIMULATION_MODE_COOKIE, "0", {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TENANT_COOKIE_MAX_AGE,
  });
}
