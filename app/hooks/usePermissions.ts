"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

export type RoleType = "Global Admin" | "Company Analyst" | "Auditor";

const VALID_TENANTS = ["medshield", "vaultbank", "gridcore"] as const;
export type TenantSlug = (typeof VALID_TENANTS)[number];

const ROLE_COOKIE = "ironframe-role";
const TENANT_COOKIE = "ironframe-tenant";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export type PermissionsState = {
  role: RoleType;
  tenantId: TenantSlug | null;
  /** All tenant slugs this user can access (Global Admin = all 3; Analyst = 1; Auditor = authorized list) */
  allowedTenantIds: TenantSlug[];
  isGlobalAdmin: boolean;
  isCompanyAnalyst: boolean;
  isAuditor: boolean;
  /** True if current path is under a tenant the user is not allowed to access */
  isUnauthorizedPath: boolean;
  /** Redirect to home dashboard if user is Company Analyst and path is another tenant's route */
  redirectIfUnauthorized: () => void;
  /** Check if user can access a path (read-only for Auditor on audit/reports) */
  canAccess: (path: string) => boolean;
};

function getDefaultRole(): RoleType {
  const r = getCookie(ROLE_COOKIE);
  if (r === "Company Analyst" || r === "Auditor") return r;
  return "Global Admin";
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
    if (role === "Global Admin") return [...VALID_TENANTS];
    if (role === "Company Analyst" && tenantId) return [tenantId];
    if (role === "Auditor" && tenantId) return [tenantId];
    if (role === "Auditor") return [...VALID_TENANTS]; // default: all for read-only
    return [];
  }, [role, tenantId]);

  const isGlobalAdmin = role === "Global Admin";
  const isCompanyAnalyst = role === "Company Analyst";
  const isAuditor = role === "Auditor";

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
        const allowedReadOnly = ["/reports", "/reports/audit-trail", "/audit-trail"];
        const normalized = path.startsWith("/") ? path : "/" + path;
        if (isAuditor && allowedReadOnly.some((p) => normalized === p || normalized.startsWith(p + "/"))) return true;
        if (isCompanyAnalyst) return true;
        return true;
      }
      return allowedTenantIds.includes(pathTenantSlug);
    },
    [isGlobalAdmin, isAuditor, isCompanyAnalyst, allowedTenantIds]
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

/** For middleware or server: parse role/tenant from cookies (same cookie names) */
export function getPermissionsFromRequest(cookieHeader: string | null): { role: RoleType; tenantId: TenantSlug | null } {
  const role = (cookieHeader?.match(new RegExp("(^| )" + ROLE_COOKIE + "=([^;]+)"))?.[2] ?? "") as RoleType | "";
  const tenant = cookieHeader?.match(new RegExp("(^| )" + TENANT_COOKIE + "=([^;]+)"))?.[2] ?? null;
  return {
    role: role === "Company Analyst" || role === "Auditor" ? role : "Global Admin",
    tenantId: tenant && VALID_TENANTS.includes(tenant as TenantSlug) ? (tenant as TenantSlug) : null,
  };
}
