import type { ReactNode } from "react";
import DashboardGroupShell from "@/app/(dashboard)/DashboardGroupShell";

/**
 * Dashboard route group. Tripane rails are applied in `DashboardHomeClient`;
 * rail class tokens live in `dashboardTripaneLayout.ts` and `app/config/layoutConstants.ts`.
 */
export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  return <DashboardGroupShell>{children}</DashboardGroupShell>;
}
