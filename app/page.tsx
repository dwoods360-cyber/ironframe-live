/**
 * Root route: Ironframe GRC public homepage for guests; Command Center for authenticated operators.
 * Marketing layout lives in MarketingHomepage (theme tokens + semantic HTML5 + aria-live regions).
 */

import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import DashboardGroupShell from "@/app/(dashboard)/DashboardGroupShell";
import DashboardHomeClient from "@/app/components/DashboardHomeClient";
import GlobalHealthSummaryCard from "@/app/components/GlobalHealthSummaryCard";
import MarketingHomepage from "@/app/components/marketing/MarketingHomepage";
import {
  ensureDashboardTenantSession,
  resolveDashboardAccess,
} from "@/app/lib/auth/dashboardRoleAccess";
import { tenantSlugFromHost } from "@/app/lib/tenantSubdomain";
import { resolveDashboardActiveTenantUuid } from "@/app/lib/auth/resolveDashboardActiveTenant";
import { resolveDashboardMitigatedValueCents } from "@/app/lib/ironbloom/productionCarbonLedger";
import { ingestGovernanceMaturityForTenant } from "@/app/lib/riskDeckIngress";
import { listRiskRegistryForTenant } from "@/app/lib/riskRegistryDb";
import { formatCentsToUSD } from "@/app/utils/formatCentsToUSD";

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
  const access = await ensureDashboardTenantSession(await resolveDashboardAccess());

  if (access.status === "unauthenticated") {
    const h = await headers();
    if (tenantSlugFromHost(h.get("host"))) {
      redirect("/login");
    }
    return <MarketingHomepage />;
  }

  if (access.status === "pending") {
    redirect("/unauthorized");
  }

  const tenantUuid = await resolveDashboardActiveTenantUuid();
  const serverTimeEpochMs = Date.now();

  const unifiedRiskQueue = tenantUuid ? await listRiskRegistryForTenant(tenantUuid) : [];
  const governanceMaturity = await ingestGovernanceMaturityForTenant(tenantUuid);
  const productionCarbon = await resolveDashboardMitigatedValueCents(tenantUuid);
  const carbonMitigatedDisplay = formatCentsToUSD(productionCarbon.mitigatedValueCents);

  return (
    <DashboardGroupShell initialTenantUuid={access.tenantUuid}>
      <DashboardHomeClient
        serverTimeEpochMs={serverTimeEpochMs}
        governanceMaturity={governanceMaturity}
        initialRiskRegistry={unifiedRiskQueue}
        carbonMitigatedValueCents={productionCarbon.mitigatedValueCents}
        carbonMitigatedDisplay={carbonMitigatedDisplay}
      >
        <GlobalHealthSummaryCard coreintelTrendActive={false} />
      </DashboardHomeClient>
    </DashboardGroupShell>
  );
}
