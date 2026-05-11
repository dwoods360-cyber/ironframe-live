"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  type GrcWorkspaceRole,
  parseWorkspaceRoleFromCookie,
  isBroadTenantAccess,
  isScopedAnalystRole,
  isAuditorFamilyRole,
} from "@/app/lib/grcRoles";

const VALID_TENANTS = ["medshield", "vaultbank", "gridcore", "defense"] as const;
export type TenantSlug = (typeof VALID_TENANTS)[number];

/** @deprecated Prefer `GrcWorkspaceRole`; kept for imports that still alias `RoleType`. */
export type RoleType = GrcWorkspaceRole;

const ROLE_COOKIE = "ironframe-role";
const TENANT_COOKIE = "ironframe-tenant";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export type PermissionsState = {
  role: GrcWorkspaceRole;
  tenantId: TenantSlug | null;
  /** All tenant slugs this user can access (broad roles = all 3; analysts = 1 when tenant cookie set). */
  allowedTenantIds: TenantSlug[];
  /** Broad program authority (admin, CISO, director, GRC manager). */
  isGlobalAdmin: boolean;
  /** Junior / senior analyst — single-tenant scope when tenant cookie is set. */
  isCompanyAnalyst: boolean;
  /** Internal or external auditor. */
  isAuditor: boolean;
  isUnauthorizedPath: boolean;
  redirectIfUnauthorized: () => void;
  canAccess: (path: string) => boolean;
};

function getDefaultRole(): GrcWorkspaceRole {
  return parseWorkspaceRoleFromCookie(getCookie(ROLE_COOKIE));
}

function getDefaultTenant(): TenantSlug | null {
  const t = getCookie(TENANT_COOKIE);
  if (t && VALID_TENANTS.includes(t as TenantSlug)) return t as TenantSlug;
  return null;
}

export function usePermissions(): PermissionsState {
  const pathname = usePathname();
  const router = useRouter();

  const role = getDefaultRole();
  const tenantId = getDefaultTenant();

  const allowedTenantIds = useMemo((): TenantSlug[] => {
    if (isBroadTenantAccess(role)) return [...VALID_TENANTS];
    if (isScopedAnalystRole(role) && tenantId) return [tenantId];
    if (isAuditorFamilyRole(role) && tenantId) return [tenantId];
    if (isAuditorFamilyRole(role)) return [...VALID_TENANTS];
    return [];
  }, [role, tenantId]);

  const isGlobalAdmin = isBroadTenantAccess(role);
  const isCompanyAnalyst = isScopedAnalystRole(role);
  const isAuditor = isAuditorFamilyRole(role);

  const pathTenant = useMemo(() => {
    const seg = pathname.split("/").filter(Boolean)[0];
    return seg && VALID_TENANTS.includes(seg as TenantSlug) ? (seg as TenantSlug) : null;
  }, [pathname]);

  const isUnauthorizedPath = useMemo(() => {
    if (!pathTenant) return false;
    return !allowedTenantIds.includes(pathTenant);
  }, [pathTenant, allowedTenantIds]);

  const redirectIfUnauthorized = useCallback(() => {
    if (!isCompanyAnalyst || !isUnauthorizedPath) return;
    const home = tenantId ? `/${tenantId}` : "/";
    router.replace(home);
  }, [isCompanyAnalyst, isUnauthorizedPath, tenantId, router]);

  const canAccess = useCallback(
    (path: string): boolean => {
      if (isGlobalAdmin) return true;
      const pathSeg = path.split("/").filter(Boolean)[0];
      const pathTenantSlug = pathSeg && VALID_TENANTS.includes(pathSeg as TenantSlug) ? (pathSeg as TenantSlug) : null;
      if (!pathTenantSlug) {
        const allowedReadOnly = ["/reports", "/reports/audit-trail", "/audit-trail", "/audit"];
        const normalized = path.startsWith("/") ? path : "/" + path;
        if (isAuditor && allowedReadOnly.some((p) => normalized === p || normalized.startsWith(p + "/"))) return true;
        if (isCompanyAnalyst) return true;
        return true;
      }
      return allowedTenantIds.includes(pathTenantSlug);
    },
    [isGlobalAdmin, isAuditor, isCompanyAnalyst, allowedTenantIds],
  );

  return {
    role,
    tenantId,
    allowedTenantIds,
    isGlobalAdmin,
    isCompanyAnalyst,
    isAuditor,
    isUnauthorizedPath,
    redirectIfUnauthorized,
    canAccess,
  };
}

export function getPermissionsFromRequest(cookieHeader: string | null): {
  role: GrcWorkspaceRole;
  tenantId: TenantSlug | null;
} {
  const raw = cookieHeader?.match(new RegExp("(?:^|; )" + ROLE_COOKIE + "=([^;]*)"))?.[1] ?? "";
  const role = parseWorkspaceRoleFromCookie(raw);
  const tenant = cookieHeader?.match(new RegExp("(?:^|; )" + TENANT_COOKIE + "=([^;]*)"))?.[1] ?? null;
  return {
    role,
    tenantId: tenant && VALID_TENANTS.includes(tenant as TenantSlug) ? (tenant as TenantSlug) : null,
  };
}
