import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import DashboardCommandCenterLayout from "@/app/(dashboard)/DashboardCommandCenterLayout";
import DashboardGroupShell from "@/app/(dashboard)/DashboardGroupShell";
import DashboardBillingGate from "@/app/components/billing/DashboardBillingGate";
import {
  ensureDashboardTenantSession,
  resolveDashboardAccess,
} from "@/app/lib/auth/dashboardRoleAccess";
import { canUsePlatformAdminTools } from "@/app/lib/auth/platformAdminAccess";
import { resolveTenantBillingEntitlementByUuid } from "@/app/lib/billing/tenantBillingEntitlement";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardGroupLayout({ children }: { children: ReactNode }) {
  const access = await ensureDashboardTenantSession(await resolveDashboardAccess());

  if (access.status === "unauthenticated") {
    redirect("/login");
  }

  if (access.status === "pending") {
    redirect("/unauthorized");
  }

  const platformAdmin = await canUsePlatformAdminTools();
  const billing = await resolveTenantBillingEntitlementByUuid(access.tenantUuid);
  const tenant = await prisma.tenant.findUnique({
    where: { id: access.tenantUuid },
    select: { slug: true },
  });
  const tenantSlug = tenant?.slug ?? "workspace";
  const billingBlocked = Boolean(billing?.blocked && !platformAdmin);

  return (
    <DashboardCommandCenterLayout>
      <DashboardGroupShell initialTenantUuid={access.tenantUuid}>
        <DashboardBillingGate
          blocked={billingBlocked}
          tenantSlug={tenantSlug}
          billingStatus={billing?.status ?? "UNTRACKED"}
        >
          {children}
        </DashboardBillingGate>
      </DashboardGroupShell>
    </DashboardCommandCenterLayout>
  );
}
