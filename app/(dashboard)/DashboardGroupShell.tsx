"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  DASHBOARD_GRID_PROPORTIONS,
  DASHBOARD_GROUP_SHELL,
  DASHBOARD_LAYOUT_LEFT_RAIL,
  DASHBOARD_LAYOUT_RIGHT_RAIL,
} from "@/app/lib/dashboardTripaneLayout";
import { readIronframeTenantCookie } from "@/app/utils/commandCenterScopeSync";
import { isScrollableStandalonePath } from "@/app/utils/grcRouteMatch";
import { setIronguardEffectiveTenant } from "@/app/utils/ironguardSession";
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
  const standaloneScroll = isScrollableStandalonePath(pathname);

  useEffect(() => {
    const cookieScope = resolveDashboardTenantUuid(null);
    if (cookieScope) {
      setIronguardEffectiveTenant(cookieScope);
      return;
    }
    if (!initialTenantUuid?.trim()) {
      return;
    }
    const token = tenantKeyFromUuid(initialTenantUuid) ?? initialTenantUuid.trim();
    if (!readIronframeTenantCookie()) {
      writeIronframeTenantCookie(token);
      window.dispatchEvent(new Event("ironframe-tenant-changed"));
    }
    setIronguardEffectiveTenant(initialTenantUuid.trim());
  }, [initialTenantUuid]);

  return (
    <div
      className={
        standaloneScroll
          ? "flex w-full min-w-0 flex-col bg-slate-950"
          : `${DASHBOARD_GROUP_SHELL} border-none p-0 shadow-none`
      }
      data-dashboard-left-rail={DASHBOARD_LAYOUT_LEFT_RAIL}
      data-dashboard-right-rail={DASHBOARD_LAYOUT_RIGHT_RAIL}
      data-dashboard-rail-floor-lock={DASHBOARD_GRID_PROPORTIONS}
    >
      {children}
    </div>
  );
}
