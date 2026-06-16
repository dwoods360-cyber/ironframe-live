import type { ReactNode } from "react";

import DashboardCommandCenterLayout from "@/app/(dashboard)/DashboardCommandCenterLayout";
import DashboardGroupShell from "@/app/(dashboard)/DashboardGroupShell";
import DemoModeBootstrap from "@/app/components/demo/DemoModeBootstrap";
import { DEMO_ENCLAVE_UUID } from "@/app/lib/demo/demoMode";

export const dynamic = "force-dynamic";

/**
 * Isolated demo route group — no Supabase session or DB provision required.
 * Production telemetry stays behind apiClient demo guards.
 */
export default function DemoRouteGroupLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardCommandCenterLayout>
      <DemoModeBootstrap>
        <DashboardGroupShell initialTenantUuid={DEMO_ENCLAVE_UUID}>{children}</DashboardGroupShell>
      </DemoModeBootstrap>
    </DashboardCommandCenterLayout>
  );
}
