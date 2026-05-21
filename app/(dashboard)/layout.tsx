import type { ReactNode } from "react";
import {
  DASHBOARD_GROUP_SHELL,
  DASHBOARD_LAYOUT_LEFT_RAIL,
  DASHBOARD_LAYOUT_RIGHT_RAIL,
} from "@/app/lib/dashboardTripaneLayout";

/**
 * Dashboard route group. Tripane rails are applied in `DashboardHomeClient`;
 * rail class tokens live in `dashboardTripaneLayout.ts` and `app/config/layoutConstants.ts`.
 */
export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${DASHBOARD_GROUP_SHELL} flex min-h-0 w-full flex-1 flex-col overflow-hidden border-none p-0 shadow-none`}
      data-dashboard-left-rail={DASHBOARD_LAYOUT_LEFT_RAIL}
      data-dashboard-right-rail={DASHBOARD_LAYOUT_RIGHT_RAIL}
      data-dashboard-rail-floor-lock="flex-none shrink-0 w-96"
    >
      {children}
    </div>
  );
}
