import { buildTenantSubdomainOrigin } from "@/app/lib/tenantSubdomain";

/** Canonical post-activation route for corporate workspace onboarding. */
export const WORKSPACE_ACTIVATION_LANDING_PATH = "/get-started?activation=1";

export function buildTenantActivationLandingUrl(tenantSlug: string): string {
  const slug = tenantSlug.trim().toLowerCase();
  return `${buildTenantSubdomainOrigin(slug)}${WORKSPACE_ACTIVATION_LANDING_PATH}`;
}

/** Split path + query for session-bootstrap `next` param (avoids double-encoding). */
export function workspaceActivationNextParam(): string {
  return WORKSPACE_ACTIVATION_LANDING_PATH;
}
