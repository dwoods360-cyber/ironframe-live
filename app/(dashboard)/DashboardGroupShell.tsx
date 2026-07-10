"use client";

import type { ReactNode } from "react";
import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import {
  DASHBOARD_GRID_PROPORTIONS,
  DASHBOARD_GROUP_SHELL,
  DASHBOARD_LAYOUT_LEFT_RAIL,
  DASHBOARD_LAYOUT_RIGHT_RAIL,
} from "@/app/lib/dashboardTripaneLayout";
import { readIronframeTenantCookie } from "@/app/utils/commandCenterScopeSync";
import { isViewportBoundedDashboardPath } from "@/app/utils/grcRouteMatch";
import {
  setDashboardWorkspaceFallbackTenant,
  setIronguardEffectiveTenant,
} from "@/app/utils/ironguardSession";
import { tenantKeyFromUuid } from "@/app/utils/tenantIsolation";
import { resolveDashboardTenantUuid } from "@/app/utils/clientTenantCookie";

type Props = {
  children: ReactNode;
  /** Server-resolved workspace UUID when session cookie was missing. */
  initialTenantUuid?: string | null;
};

function writeIronframeTenantCookie(raw: string): void {
  const maxAge = 60 * 60 * 24 * 180;
  document.cookie = `ironframe-tenant=${encodeURIComponent(raw)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Tripane home needs a bounded height + overflow-hidden so column panes scroll.
 * Standalone pages (board report, integrity hub, profile) must grow with content
 * so AppShell's main scroll track can move.
 */
export default function DashboardGroupShell({ children, initialTenantUuid }: Props) {
  const pathname = usePathname();
  const viewportBounded = isViewportBoundedDashboardPath(pathname);

  useLayoutEffect(() => {
    const resolvedInitial = initialTenantUuid?.trim() || null;
    setDashboardWorkspaceFallbackTenant(resolvedInitial);

    const cookieScope = resolveDashboardTenantUuid(null);

    /** Host-bound / server-resolved workspace wins over a stale cross-tenant cookie. */
    if (resolvedInitial && cookieScope && cookieScope !== resolvedInitial) {
      const token = tenantKeyFromUuid(resolvedInitial) ?? resolvedInitial;
      writeIronframeTenantCookie(token);
      window.dispatchEvent(new Event("ironframe-tenant-changed"));
      setIronguardEffectiveTenant(resolvedInitial);
      return;
    }

    if (cookieScope) {
      setIronguardEffectiveTenant(cookieScope);
      return;
    }
    if (!resolvedInitial) {
      return;
    }
    const token = tenantKeyFromUuid(resolvedInitial) ?? resolvedInitial;
    if (!readIronframeTenantCookie()) {
      writeIronframeTenantCookie(token);
      window.dispatchEvent(new Event("ironframe-tenant-changed"));
    }
    setIronguardEffectiveTenant(resolvedInitial);
  }, [initialTenantUuid]);

  return (
    <div
      className={
        viewportBounded
          ? `${DASHBOARD_GROUP_SHELL} border-none p-0 shadow-none`
          : "flex w-full min-w-0 flex-col bg-slate-950"
      }
      data-dashboard-left-rail={DASHBOARD_LAYOUT_LEFT_RAIL}
      data-dashboard-right-rail={DASHBOARD_LAYOUT_RIGHT_RAIL}
      data-dashboard-rail-floor-lock={DASHBOARD_GRID_PROPORTIONS}
    >
      {children}
    </div>
  );
}
