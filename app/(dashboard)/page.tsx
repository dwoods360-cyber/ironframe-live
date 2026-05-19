import DashboardHomeClient from "@/app/components/DashboardHomeClient";
import GlobalHealthSummaryCard from "@/app/components/GlobalHealthSummaryCard";
import { ingestGovernanceMaturityForTenant } from "@/app/lib/riskDeckIngress";
import { listRiskRegistryForTenant } from "@/app/lib/riskRegistryDb";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

export const dynamic = "force-dynamic";

/**
 * Dashboard RSC: wires forensic center lane into `DashboardHomeClient`.
 * Vertical order (below sync banner): GRC maturity strip → scrutiny / ALE → Enterprise Risk Posture.
 * Stage-1 registry ingress (Irongate) hydrates via `initialRiskRegistry` — not a dedicated UI deck.
 */
export default async function DashboardPage() {
  const tenantUuid = await getActiveTenantUuidFromCookies();
  const serverTimeEpochMs = Date.now();

  const unifiedRiskQueue = tenantUuid ? await listRiskRegistryForTenant(tenantUuid) : [];
  const governanceMaturity = await ingestGovernanceMaturityForTenant(tenantUuid);

  return (
    <DashboardHomeClient
      serverTimeEpochMs={serverTimeEpochMs}
      governanceMaturity={governanceMaturity}
      initialRiskRegistry={unifiedRiskQueue}
    >
      <GlobalHealthSummaryCard coreintelTrendActive={false} />
    </DashboardHomeClient>
  );
}
