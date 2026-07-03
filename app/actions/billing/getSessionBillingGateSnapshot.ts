"use server";

import { canUsePlatformAdminTools } from "@/app/lib/auth/platformAdminAccess";
import {
  ensureDashboardTenantSession,
  resolveDashboardAccess,
} from "@/app/lib/auth/dashboardRoleAccess";
import { resolveTenantBillingEntitlementByUuid } from "@/app/lib/billing/tenantBillingEntitlement";

export type SessionBillingGateSnapshot = {
  billingBlocked: boolean;
  billingStatus: string;
};

export async function getSessionBillingGateSnapshot(): Promise<SessionBillingGateSnapshot> {
  const access = await ensureDashboardTenantSession(await resolveDashboardAccess());
  if (access.status !== "allowed") {
    return { billingBlocked: false, billingStatus: "UNTRACKED" };
  }

  const [platformAdmin, billing] = await Promise.all([
    canUsePlatformAdminTools(),
    resolveTenantBillingEntitlementByUuid(access.tenantUuid),
  ]);

  return {
    billingBlocked: Boolean(billing?.blocked && !platformAdmin),
    billingStatus: billing?.status ?? "UNTRACKED",
  };
}
