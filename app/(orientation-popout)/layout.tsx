import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import {
  ensureDashboardTenantSession,
  resolveDashboardAccess,
} from "@/app/lib/auth/dashboardRoleAccess";
import { ORIENTATION_WALKTHROUGH_PATH } from "@/app/lib/openOrientationWalkthroughWindow";

export const dynamic = "force-dynamic";

export default async function OrientationPopoutLayout({ children }: { children: ReactNode }) {
  const access = await ensureDashboardTenantSession(await resolveDashboardAccess());

  if (access.status === "unauthenticated") {
    redirect(`/login?next=${encodeURIComponent(ORIENTATION_WALKTHROUGH_PATH)}`);
  }

  if (access.status === "pending") {
    redirect("/unauthorized");
  }

  return <>{children}</>;
}
