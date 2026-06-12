"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  DASHBOARD_GRID_PROPORTIONS,
  DASHBOARD_GROUP_SHELL,
  DASHBOARD_LAYOUT_LEFT_RAIL,
  DASHBOARD_LAYOUT_RIGHT_RAIL,
} from "@/app/lib/dashboardTripaneLayout";
import { isScrollableStandalonePath } from "@/app/utils/grcRouteMatch";

/**
 * Tripane home needs a bounded height + overflow-hidden so column panes scroll.
 * Standalone pages (board report, integrity hub, profile) must grow with content
 * so AppShell's main scroll track can move.
 */
export default function DashboardGroupShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const standaloneScroll = isScrollableStandalonePath(pathname);

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
