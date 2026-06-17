"use client";

import DashboardHomeClient from "@/app/components/DashboardHomeClient";
import GlobalHealthSummaryCardClient, {
  type SerializedCompany,
} from "@/app/components/GlobalHealthSummaryCardClient";
import { TENANT_INDUSTRY_BASELINE_ALE_CENTS } from "@/app/constants/devTenantRoster";
import { tenantBaselineToSnapshot } from "@/app/lib/grcMaturityTenantBaselines";
import { formatCentsToUSD } from "@/app/utils/formatCentsToUSD";

const DEMO_TELEMETRY = {
  activeExposureUsd: 96500,
  pipelineExposureUsd: 154000,
  mitigatedExposureUsd: 42000,
  activeCount: 3,
  pipelineCount: 2,
  slaBreachCount: 0,
  oldestPipelineThreatAt: null,
} as const;

const DEMO_SUSTAINABILITY = {
  totalKwh: 1200,
  totalWaterLiters: 450,
  totalCarbonGrams: 850000,
  totalCarbonKg: 850,
  recordCount: 12,
  energyDisplay: "1,200 kWh",
  waterDisplay: "450 L",
  carbonDisplay: "850 kg CO₂e",
  chipLineCarbon: "850 kg CO₂e offset",
  chipLineEnergy: "1,200 kWh saved",
  co2OffsetKgChip: "CO2 Offset: 850 kg",
  energySavedLine: "Energy Saved: 1,200 kWh",
  waterAvertedLine: "Water Averted: 450 L",
  totalOffsetKgCo2eLine: "Total Offset: 850 kg CO₂e",
} as const;

const DEMO_COMPANIES: SerializedCompany[] = [
  {
    name: "Medshield Health",
    sector: "Healthcare",
    risks: [{ status: "OPEN" }, { status: "MITIGATED" }],
    policies: [{ status: "ACTIVE" }],
    industry_avg_loss_cents: 9650000,
  },
  {
    name: "Vaultbank Financial",
    sector: "Financial Services",
    risks: [{ status: "OPEN" }],
    policies: [{ status: "ACTIVE" }, { status: "DRAFT" }],
    industry_avg_loss_cents: 15400000,
  },
];

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
      carbonMitigatedValueCents={aggregateCents.toString()}
      carbonMitigatedDisplay={carbonDisplay}
    >
      <GlobalHealthSummaryCardClient
        companies={DEMO_COMPANIES}
        telemetryData={DEMO_TELEMETRY}
        sustainabilityImpact={DEMO_SUSTAINABILITY}
        coreintelTrendActive={false}
      />
    </DashboardHomeClient>
  );
}
