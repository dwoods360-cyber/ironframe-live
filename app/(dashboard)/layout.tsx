import type { ReactNode } from "react";
import {
  DASHBOARD_GROUP_SHELL,
  DASHBOARD_LAYOUT_LEFT_RAIL,
  DASHBOARD_LAYOUT_RIGHT_RAIL,
} from "@/app/lib/dashboardTripaneLayout";

/** Symmetric sidebar vertebrae — both rails locked at w-96 (384px). */
export const DASHBOARD_GROUP_LEFT_RAIL = "flex-none shrink-0 w-96";
export const DASHBOARD_GROUP_RIGHT_RAIL = "flex-none shrink-0 w-96";

export { DASHBOARD_LAYOUT_LEFT_RAIL, DASHBOARD_LAYOUT_RIGHT_RAIL };

/**
 * Dashboard route group. Tripane rails are applied in `DashboardHomeClient`;
 * constants above match `DASHBOARD_LAYOUT_*_RAIL` in `dashboardTripaneLayout.ts`.
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
