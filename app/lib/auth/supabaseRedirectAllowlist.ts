import "server-only";

import { resolveLocalDevAppPort, resolvePublicAppUrl } from "@/app/lib/auth/publicAppUrl";
import { resolveTenantApexDomain } from "@/app/lib/tenantSubdomain";

/**
 * Supabase Auth → URL configuration allow-list (Site URL + Redirect URLs).
 * Paste into Dashboard → Authentication → URL Configuration for staging + local dev.
 */
export function buildSupabaseRedirectAllowlist(): readonly string[] {
  const apex = resolveTenantApexDomain() ?? "ironframegrc.com";
  const stagingApex = process.env.IRONFRAME_STAGING_APEX_DOMAIN?.trim() || `staging.${apex}`;
  const appUrl = resolvePublicAppUrl().replace(/\/$/, "") || `https://${apex}`;
  const localPort = String(resolveLocalDevAppPort());

  const patterns = new Set<string>([
    appUrl.replace(/\/$/, ""),
    `https://${apex}`,
    `https://www.${apex}`,
    `https://*.${apex}/**`,
    `https://*.${stagingApex}/**`,
    `http://localhost:${localPort}/**`,
    `http://127.0.0.1:${localPort}/**`,
    `http://*.lvh.me:${localPort}/**`,
    `http://*.localtest.me:${localPort}/**`,
    `http://*.localhost:${localPort}/**`,
  ]);

  return [...patterns];
}
