/**
 * ===================================================================
 * 🔒 CONSTITUTIONAL LAYOUT LOCK — DO NOT ALTER VERTICAL PANEL WIDTHS
 * APPROVED GEOMETRY GROUND TRUTH: image_d51e84.png
 * ===================================================================
 * This core layout uses an unyielding, fixed fractional layout grid.
 * Any modification to panel flex, widths, or scaling behaviors
 * violates structural integrity and is strictly forbidden.
 * ===================================================================
 *
 * Home route lives at app/page.tsx (not inside a route group) so Next.js
 * generates the client-reference manifest correctly on Vercel.
 */

import { redirect } from "next/navigation";
import DashboardGroupShell from "@/app/(dashboard)/DashboardGroupShell";
import DashboardHomeClient from "@/app/components/DashboardHomeClient";
import GlobalHealthSummaryCard from "@/app/components/GlobalHealthSummaryCard";
import { resolveDashboardAccess } from "@/app/lib/auth/dashboardRoleAccess";
import { resolveDashboardMitigatedValueCents } from "@/app/lib/ironbloom/productionCarbonLedger";
import { ingestGovernanceMaturityForTenant } from "@/app/lib/riskDeckIngress";
import { listRiskRegistryForTenant } from "@/app/lib/riskRegistryDb";
import { formatCentsToUSD } from "@/app/utils/formatCentsToUSD";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

export const dynamic = "force-dynamic";

/**
 * Dashboard RSC: wires forensic center lane into `DashboardHomeClient`.
 * Center pane: GRC maturity strip (four chips) → handshake / ALE map → Enterprise Risk Posture → Risk Ingestion / Registration → Active Risks.
 * No RiskDeckGovernanceIngress or RiskEventsRegulatoryOverlay — stage-1 ingress is logs / assignee history only.
 */
export default async function HomePage() {
  const access = await resolveDashboardAccess();
  if (access.status === "unauthenticated") {
    redirect("/login");
  }
  if (access.status === "pending") {
    redirect("/unauthorized");
  }

  const tenantUuid = await getActiveTenantUuidFromCookies();
  const serverTimeEpochMs = Date.now();

  const unifiedRiskQueue = tenantUuid ? await listRiskRegistryForTenant(tenantUuid) : [];
  const governanceMaturity = await ingestGovernanceMaturityForTenant(tenantUuid);
  const productionCarbon = await resolveDashboardMitigatedValueCents(tenantUuid);
  const carbonMitigatedDisplay = formatCentsToUSD(productionCarbon.mitigatedValueCents);

  return (
    <DashboardGroupShell>
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
