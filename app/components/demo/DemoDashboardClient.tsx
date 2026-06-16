"use client";

import DashboardHomeClient from "@/app/components/DashboardHomeClient";
import GlobalHealthSummaryCard from "@/app/components/GlobalHealthSummaryCard";
import { TENANT_INDUSTRY_BASELINE_ALE_CENTS } from "@/app/constants/devTenantRoster";
import { tenantBaselineToSnapshot } from "@/app/lib/grcMaturityTenantBaselines";
import { formatCentsToUSD } from "@/app/utils/formatCentsToUSD";

const aggregateCents =
  TENANT_INDUSTRY_BASELINE_ALE_CENTS.medshield +
  TENANT_INDUSTRY_BASELINE_ALE_CENTS.vaultbank +
  TENANT_INDUSTRY_BASELINE_ALE_CENTS.gridcore;

const mockGovernance = tenantBaselineToSnapshot("medshield");

/** Main Ops tripane — static mock props, no Supabase or Prisma. */
export default function DemoDashboardClient() {
  const carbonDisplay = formatCentsToUSD(aggregateCents);

  return (
    <DashboardHomeClient
      serverTimeEpochMs={Date.now()}
      governanceMaturity={mockGovernance}
      initialRiskRegistry={[]}
      carbonMitigatedValueCents={aggregateCents}
      carbonMitigatedDisplay={carbonDisplay}
    >
      <GlobalHealthSummaryCard coreintelTrendActive={false} />
    </DashboardHomeClient>
  );
}
