import "server-only";

import { cookies, headers } from "next/headers";

import {
  resolveApexCommandPostWorkspaceTarget,
  resolveCommandPostWorkspaceTarget,
  type CommandPostWorkspaceTarget,
} from "@/app/lib/commandPostNavigation";
import { resolveCommandCenterTenantScope } from "@/app/lib/auth/commandCenterTenantAccess";
import { resolveDashboardAccess } from "@/app/lib/auth/dashboardRoleAccess";
import { readTenantSlugFromUserMetadata } from "@/app/lib/auth/tenantInviteMetadata";
import { resolveApexWorkspaceLandingSlug } from "@/app/lib/auth/resolveApexWorkspaceLandingSlug";
import { isApexControlPlaneHost, tenantSlugFromHost } from "@/app/lib/tenantSubdomain";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import prisma from "@/lib/prisma";

const IRONFRAME_TENANT_COOKIE = "ironframe-tenant";

async function enrichCommandPostTargetFromDashboardAccess(
  target: CommandPostWorkspaceTarget,
): Promise<CommandPostWorkspaceTarget> {
  if (target.workspaceSlug?.trim()) return target;

  const access = await resolveDashboardAccess();
  if (access.status !== "allowed") return target;

  const tenant = await prisma.tenant.findUnique({
    where: { id: access.tenantUuid },
    select: { slug: true },
  });
  const slug = tenant?.slug?.trim().toLowerCase();
  if (!slug) return target;

  return resolveApexCommandPostWorkspaceTarget([], null, slug, true);
}

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
        user.email,
      )
    : null;

  const target = resolveApexCommandPostWorkspaceTarget(
    scope.tenants,
    cookieRaw,
    landingSlug,
    scope.canAccessGlobal,
  );

  return enrichCommandPostTargetFromDashboardAccess(target);
}
