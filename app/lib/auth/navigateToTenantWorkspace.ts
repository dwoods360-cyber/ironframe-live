"use client";

import { buildTenantSubdomainOrigin } from "@/app/lib/tenantSubdomain";
import { createClient } from "@/lib/supabase/client";

/**
 * Cross-host workspace navigation — server mints bootstrap ticket and 302s to tenant host.
 * Refreshes the browser session before launch so API routes receive Supabase cookies.
 */
export async function navigateToTenantWorkspace(
  tenantSlug: string,
  nextPath = "/",
): Promise<void> {
  const slug = tenantSlug.trim().toLowerCase();
  if (!slug) return;

  const supabase = createClient();
  await supabase.auth.getUser();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    await supabase.auth.refreshSession();
  }

  const params = new URLSearchParams({
    tenant: slug,
    next: nextPath,
  });
  window.location.assign(`/api/auth/workspace-launch?${params.toString()}`);
}

export function buildWorkspaceLaunchUrl(tenantSlug: string, nextPath = "/"): string {
  const slug = tenantSlug.trim().toLowerCase();
  const params = new URLSearchParams({ tenant: slug, next: nextPath });
  return `/api/auth/workspace-launch?${params.toString()}`;
}

export function buildTenantWorkspaceLoginUrl(tenantSlug: string, nextPath = "/"): string {
  const slug = tenantSlug.trim().toLowerCase();
  return `${buildTenantSubdomainOrigin(slug)}/login?next=${encodeURIComponent(nextPath)}`;
}
