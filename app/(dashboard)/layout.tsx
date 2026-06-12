import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import DashboardGroupShell from "@/app/(dashboard)/DashboardGroupShell";
import { resolveDashboardAccess } from "@/app/lib/auth/dashboardRoleAccess";

export const dynamic = "force-dynamic";

/**
 * Dashboard route group. Tripane rails are applied in `DashboardHomeClient`;
 * rail class tokens live in `dashboardTripaneLayout.ts` and `app/config/layoutConstants.ts`.
 */
export default async function DashboardGroupLayout({ children }: { children: ReactNode }) {
  const access = await resolveDashboardAccess();

  if (access.status === "unauthenticated") {
    redirect("/login");
  }

  if (access.status === "pending") {
    redirect("/unauthorized");
  }

  return <DashboardGroupShell>{children}</DashboardGroupShell>;
}
