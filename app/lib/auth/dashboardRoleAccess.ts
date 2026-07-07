import prisma from "@/lib/prisma";
import { isPlatformGlobalAdminEmail } from "@/config/platformSecurity";
import { isDevConstitutionalAuthorityUser } from "@/app/lib/grc/devConstitutionalElevation";
import { readTenantSlugFromUserMetadata } from "@/app/lib/auth/tenantInviteMetadata";
import { lookupTenantBySlug } from "@/app/lib/tenantSlugRegistry";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import {
  getHostBoundTenantUuid,
  getScopedTenantUuidFromCookies,
  isValidTenantUuid,
} from "@/app/utils/serverTenantContext";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";

export type DashboardAccessAllowed = {
  status: "allowed";
  userId: string;
  /** Active workspace UUID — always set when access is allowed. */
  tenantUuid: string;
  /** True when no valid session cookie matched the resolved assignment tenant. */
  tenantFallbackApplied: boolean;
};

export type DashboardAccessResult =
  | DashboardAccessAllowed
  | { status: "unauthenticated" }
  | { status: "pending"; userId: string; tenantUuid: string | null };

async function loadOrderedAssignments(userId: string): Promise<Array<{ tenantId: string }>> {
  return prisma.userRoleAssignment.findMany({
    where: { userId },
    select: { tenantId: true },
    orderBy: [{ grantedAt: "desc" }, { tenantId: "asc" }],
  });
}

function allowedFromAssignment(
  userId: string,
  tenantUuid: string,
  tenantFallbackApplied: boolean,
): DashboardAccessAllowed {
  return {
    status: "allowed",
    userId,
    tenantUuid,
    tenantFallbackApplied,
  };
}

/**
 * Resolve workspace from cookie scope first; otherwise first RBAC assignment row.
 * Preserves tenant isolation — fallback tenant always comes from user's own assignment.
 */
async function lookupRoleAssignment(
  userId: string,
  cookieTenantUuid: string | null,
  hostBoundTenantUuid: string | null,
  inviteTenantSlug: string | null,
): Promise<DashboardAccessResult> {
  if (cookieTenantUuid) {
    const scopedAssignment = await prisma.userRoleAssignment.findFirst({
      where: { userId, tenantId: cookieTenantUuid },
      select: { id: true, tenantId: true },
    });
    if (scopedAssignment) {
      return allowedFromAssignment(userId, scopedAssignment.tenantId, false);
    }
    /** Subdomain host envelope — never fall back to a different tenant assignment. */
    if (hostBoundTenantUuid && hostBoundTenantUuid === cookieTenantUuid) {
      return { status: "pending", userId, tenantUuid: cookieTenantUuid };
    }
  }

  if (!cookieTenantUuid && inviteTenantSlug) {
    const invitedTenant = await lookupTenantBySlug(inviteTenantSlug);
    if (invitedTenant) {
      const invitedAssignment = await prisma.userRoleAssignment.findFirst({
        where: { userId, tenantId: invitedTenant.id },
        select: { id: true, tenantId: true },
      });
      if (invitedAssignment) {
        return allowedFromAssignment(userId, invitedAssignment.tenantId, true);
      }
    }
  }

  if (hostBoundTenantUuid) {
    const hostAssignment = await prisma.userRoleAssignment.findFirst({
      where: { userId, tenantId: hostBoundTenantUuid },
      select: { id: true, tenantId: true },
    });
    if (hostAssignment) {
      return allowedFromAssignment(
        userId,
        hostAssignment.tenantId,
        cookieTenantUuid !== hostBoundTenantUuid,
      );
    }
    return { status: "pending", userId, tenantUuid: hostBoundTenantUuid };
  }

  const assignments = await loadOrderedAssignments(userId);
  const primary = assignments[0];
  if (!primary?.tenantId || !isValidTenantUuid(primary.tenantId)) {
    return { status: "pending", userId, tenantUuid: cookieTenantUuid };
  }

  const tenantFallbackApplied =
    cookieTenantUuid == null || cookieTenantUuid !== primary.tenantId;

  return allowedFromAssignment(userId, primary.tenantId, tenantFallbackApplied);
}

/**
 * Zero-trust dashboard gate: authenticated Supabase users without a matching
 * `user_role_assignments` row must not enter dashboard shells (no throw).
 */
export async function resolveDashboardAccess(): Promise<DashboardAccessResult> {
  try {
    const user = await getSupabaseSessionUser();
    if (!user) {
      return { status: "unauthenticated" };
    }

    const userId = typeof user.id === "string" ? user.id.trim() : "";
    if (!userId) {
      return { status: "unauthenticated" };
    }

    const hostBoundTenantUuid = await getHostBoundTenantUuid();
    const scopedRaw = await getScopedTenantUuidFromCookies();
    const cookieTenantUuid =
      scopedRaw && isValidTenantUuid(scopedRaw) ? scopedRaw.trim() : null;
    const inviteTenantSlug = readTenantSlugFromUserMetadata(user?.user_metadata ?? null);

    if (isPlatformGlobalAdminEmail(user.email)) {
      if (hostBoundTenantUuid) {
        return allowedFromAssignment(
          userId,
          hostBoundTenantUuid,
          cookieTenantUuid !== hostBoundTenantUuid,
        );
      }
      if (cookieTenantUuid) {
        const cookieTenant = await prisma.tenant.findUnique({
          where: { id: cookieTenantUuid },
          select: { id: true },
        });
        if (cookieTenant) {
          return allowedFromAssignment(userId, cookieTenantUuid, false);
        }
      }
      return allowedFromAssignment(userId, TENANT_UUIDS.medshield, true);
    }

    if (isDevConstitutionalAuthorityUser(user)) {
      if (cookieTenantUuid) {
        return allowedFromAssignment(userId, cookieTenantUuid, false);
      }
      const assignments = await loadOrderedAssignments(userId);
      const primary = assignments[0]?.tenantId;
      if (primary && isValidTenantUuid(primary)) {
        return allowedFromAssignment(userId, primary, true);
      }
      return allowedFromAssignment(userId, TENANT_UUIDS.medshield, true);
    }

    return await lookupRoleAssignment(userId, cookieTenantUuid, hostBoundTenantUuid, inviteTenantSlug);
  } catch (error) {
    console.error("[dashboardRoleAccess] resolveDashboardAccess failed", error);

    try {
      const user = await getSupabaseSessionUser();
      const userId = typeof user?.id === "string" ? user.id.trim() : "";
      if (!userId) {
        return { status: "unauthenticated" };
      }
      return { status: "pending", userId, tenantUuid: null };
    } catch {
      return { status: "unauthenticated" };
    }
  }
}

/** RBAC access result — tenant cookie hydration runs in Route Handlers or client shell (not RSC). */
export async function ensureDashboardTenantSession(
  access: DashboardAccessResult,
): Promise<DashboardAccessResult> {
  return access;
}
