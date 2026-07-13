import { Suspense } from "react";
import GetStartedPortalClient from "./GetStartedPortalClient";
import {
  ensureDashboardTenantSession,
  resolveDashboardAccess,
} from "@/app/lib/auth/dashboardRoleAccess";
import { canUsePlatformAdminTools } from "@/app/lib/auth/platformAdminAccess";
import { resolveTenantBillingEntitlementByUuid } from "@/app/lib/billing/tenantBillingEntitlement";
import { resolveTenantActivationCheckoutUrlForUuid } from "@/app/lib/billing/resolveTenantActivationCheckoutUrl.server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Get Started | Ironframe Command Post",
  description:
    "Progressive onboarding portal — quick-start guides, Level 1 training, and Trainer agent sandbox.",
};

export default async function GetStartedPage() {
  const access = await ensureDashboardTenantSession(await resolveDashboardAccess());
  let initialAleBaselineCents = "0";
  let initialHasPrimaryCompany = false;
  let initialTenantName = "";
  let initialTenantIndustry = "";
  let billingBlocked = false;
  let billingStatus = "UNTRACKED";
  let billingCheckoutUrl: string | null = null;

  if (access.status === "allowed") {
    const platformAdmin = await canUsePlatformAdminTools();
    const billing = await resolveTenantBillingEntitlementByUuid(access.tenantUuid);
    billingStatus = billing?.status ?? "UNTRACKED";
    billingBlocked = Boolean(billing?.blocked && !platformAdmin);

    const [tenant, primaryCompany] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: access.tenantUuid },
        select: { ale_baseline: true, name: true, industry: true, slug: true },
      }),
      prisma.company.findFirst({
        where: { tenantId: access.tenantUuid, isTestRecord: false },
        select: { id: true },
      }),
    ]);
    initialAleBaselineCents = tenant?.ale_baseline?.toString() ?? "0";
    initialHasPrimaryCompany = Boolean(primaryCompany);
    initialTenantName = tenant?.name ?? "";
    initialTenantIndustry = tenant?.industry ?? "";

    if (billingBlocked) {
      billingCheckoutUrl = await resolveTenantActivationCheckoutUrlForUuid(access.tenantUuid);
    }
  }

  return (
    <Suspense fallback={null}>
      <GetStartedPortalClient
        initialAleBaselineCents={initialAleBaselineCents}
        initialHasPrimaryCompany={initialHasPrimaryCompany}
        initialTenantName={initialTenantName}
        initialTenantIndustry={initialTenantIndustry}
        billingBlocked={billingBlocked}
        billingStatus={billingStatus}
        billingCheckoutUrl={billingCheckoutUrl}
      />
    </Suspense>
  );
}
