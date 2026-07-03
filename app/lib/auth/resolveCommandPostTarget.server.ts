import "server-only";

import { cookies, headers } from "next/headers";

import {
  resolveApexCommandPostWorkspaceTarget,
  resolveCommandPostWorkspaceTarget,
  type CommandPostWorkspaceTarget,
} from "@/app/lib/commandPostNavigation";
import { resolveCommandCenterTenantScope } from "@/app/lib/auth/commandCenterTenantAccess";
import { readTenantSlugFromUserMetadata } from "@/app/lib/auth/tenantInviteMetadata";
import { resolveApexWorkspaceLandingSlug } from "@/app/lib/auth/resolveApexWorkspaceLandingSlug";
import { isApexControlPlaneHost, tenantSlugFromHost } from "@/app/lib/tenantSubdomain";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";

const IRONFRAME_TENANT_COOKIE = "ironframe-tenant";

/** Server-resolved Command Post workspace target for dashboard chrome (SSR + actions). */
export async function resolveServerCommandPostTarget(): Promise<CommandPostWorkspaceTarget> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const hostTenantSlug = tenantSlugFromHost(host);

  if (hostTenantSlug && !isApexControlPlaneHost(host)) {
    return resolveCommandPostWorkspaceTarget(hostTenantSlug, [], null);
  }

  const cookieStore = await cookies();
  const cookieRaw = cookieStore.get(IRONFRAME_TENANT_COOKIE)?.value ?? null;
  const scope = await resolveCommandCenterTenantScope();
  const user = await getSupabaseSessionUser();
  const landingSlug = user?.id
    ? await resolveApexWorkspaceLandingSlug(
        user.id,
        readTenantSlugFromUserMetadata(user.user_metadata ?? null),
      )
    : null;

  return resolveApexCommandPostWorkspaceTarget(
    scope.tenants,
    cookieRaw,
    landingSlug,
    scope.canAccessGlobal,
  );
}
