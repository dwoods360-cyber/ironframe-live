/**
 * Root route: tenant subdomain Command Post; apex routes to Integrity Hub or sign-in.
 * Public marketing copy lives at `/marketing`.
 */

import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import DashboardGroupShell from "@/app/(dashboard)/DashboardGroupShell";
import DashboardHomeClient from "@/app/components/DashboardHomeClient";
import DashboardBillingGate from "@/app/components/billing/DashboardBillingGate";
import GlobalHealthSummaryCard from "@/app/components/GlobalHealthSummaryCard";
import {
  ensureDashboardTenantSession,
  resolveDashboardAccess,
} from "@/app/lib/auth/dashboardRoleAccess";
import { canUsePlatformAdminTools } from "@/app/lib/auth/platformAdminAccess";
import { resolveTenantBillingEntitlementByUuid } from "@/app/lib/billing/tenantBillingEntitlement";
import { tenantSlugFromHost } from "@/app/lib/tenantSubdomain";
import { getHostBoundTenantUuid } from "@/app/utils/serverTenantContext";
import { resolveDashboardActiveTenantUuid } from "@/app/lib/auth/resolveDashboardActiveTenant";
import { resolveDashboardMitigatedValueCents } from "@/app/lib/ironbloom/productionCarbonLedger";
import { ingestGovernanceMaturityForTenant } from "@/app/lib/riskDeckIngress";
import { listRiskRegistryForTenant } from "@/app/lib/riskRegistryDb";
import { formatCentsToUSD } from "@/app/utils/formatCentsToUSD";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const access = await resolveDashboardAccess();
  if (access.status === "allowed") {
    return {
      title: "Ironframe — Control-First GRC",
      description: "Autonomous governance telemetry and cyber insurance optimization platform.",
    };
  }

  return {
    title: "Ironframe | The Immutable Standard for AI-Driven GRC",
    description:
      "Multi-tenant GRC command post for regulated enterprises — finance, healthcare, utilities, and defense. Deterministic threat-to-board telemetry with tenant-scoped vaults.",
  };
}

export default async function HomePage() {
  const h = await headers();
  const hostSlug = tenantSlugFromHost(h.get("host"));
  const access = await ensureDashboardTenantSession(await resolveDashboardAccess());

  /** Apex (localhost, www): Integrity Hub lane — not marketing, not Command Post. */
  if (!hostSlug) {
    if (access.status === "unauthenticated") {
      redirect("/login");
    }
    if (access.status === "pending") {
      redirect("/unauthorized");
    }
    redirect("/integrity");
  }

  if (access.status === "unauthenticated") {
    redirect("/login");
  }

  if (access.status === "pending") {
    redirect("/unauthorized");
  }

  if (hostSlug) {
    const hostTenantUuid = await getHostBoundTenantUuid();
    if (hostTenantUuid && access.tenantUuid !== hostTenantUuid) {
      redirect("/unauthorized");
    }
  }

  const tenantUuid = await resolveDashboardActiveTenantUuid();
  const serverTimeEpochMs = Date.now();

  const platformAdmin = await canUsePlatformAdminTools();
  const billing = await resolveTenantBillingEntitlementByUuid(access.tenantUuid);
  const tenant = await prisma.tenant.findUnique({
    where: { id: access.tenantUuid },
    select: { slug: true },
  });
  const tenantSlug = tenant?.slug ?? hostSlug ?? "workspace";
  const billingBlocked = Boolean(billing?.blocked && !platformAdmin);

  const unifiedRiskQueue = tenantUuid ? await listRiskRegistryForTenant(tenantUuid) : [];
  const governanceMaturity = await ingestGovernanceMaturityForTenant(tenantUuid);
  const productionCarbon = await resolveDashboardMitigatedValueCents(tenantUuid);
  const carbonMitigatedDisplay = formatCentsToUSD(productionCarbon.mitigatedValueCents);

  return (
    <DashboardGroupShell initialTenantUuid={access.tenantUuid}>
      <DashboardBillingGate
        blocked={billingBlocked}
        tenantSlug={tenantSlug}
        billingStatus={billing?.status ?? "UNTRACKED"}
      >
        <DashboardHomeClient
          serverTimeEpochMs={serverTimeEpochMs}
          governanceMaturity={governanceMaturity}
          initialRiskRegistry={unifiedRiskQueue}
          carbonMitigatedValueCents={productionCarbon.mitigatedValueCents}
          carbonMitigatedDisplay={carbonMitigatedDisplay}
        >
          <GlobalHealthSummaryCard coreintelTrendActive={false} />
        </DashboardHomeClient>
      </DashboardBillingGate>
    </DashboardGroupShell>
  );
}
