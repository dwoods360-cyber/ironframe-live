import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import DashboardCommandCenterLayout from "@/app/(dashboard)/DashboardCommandCenterLayout";
import DashboardGroupShell from "@/app/(dashboard)/DashboardGroupShell";
import {
  ensureDashboardTenantSession,
  resolveDashboardAccess,
} from "@/app/lib/auth/dashboardRoleAccess";

export const dynamic = "force-dynamic";

/**
 * Dashboard route group — auth gate + command center chrome (TopNav) + tripane shell.
 * Rail class tokens live in `dashboardTripaneLayout.ts` and `app/config/layoutConstants.ts`.
 */
export default async function DashboardGroupLayout({ children }: { children: ReactNode }) {
  const access = await ensureDashboardTenantSession(await resolveDashboardAccess());

  if (access.status === "unauthenticated") {
    redirect("/login");
  }

  if (access.status === "pending") {
    redirect("/unauthorized");
  }

  return (
    <DashboardCommandCenterLayout>
      <DashboardGroupShell initialTenantUuid={access.tenantUuid}>
        {children}
      </DashboardGroupShell>
    </DashboardCommandCenterLayout>
  );
}
