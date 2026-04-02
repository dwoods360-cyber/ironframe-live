/** Enterprise Risk Posture strip: server data + `GlobalHealthSummaryCardClient` (CSRD outcomes + agent fleet health). */
import { cache } from "react";
import GlobalHealthSummaryCardClient, {
  type SerializedCompany,
} from "./GlobalHealthSummaryCardClient";
import { getGlobalTelemetry } from "@/app/actions/dashboardActions";
import { getGlobalSustainabilityImpact } from "@/app/actions/sustainabilityActions";
import prisma from "@/lib/prisma";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

export type { SerializedCompany };

export interface GlobalHealthSummaryCardProps {
  coreintelTrendActive?: boolean;
}

const getCompaniesForTenant = cache(async (tenantUuid: string) =>
  prisma.company.findMany({
    where: { tenantId: tenantUuid },
    include: { policies: true, risks: true },
  }),
);

const getTelemetryForTenant = cache(async (tenantUuid: string) => getGlobalTelemetry(tenantUuid));

export default async function GlobalHealthSummaryCard({
  coreintelTrendActive = false,
}: GlobalHealthSummaryCardProps) {
  const tenantUuid = await getActiveTenantUuidFromCookies();
  const [telemetryData, sustainabilityImpact, rawCompanies] = await Promise.all([
    getTelemetryForTenant(tenantUuid),
    getGlobalSustainabilityImpact(),
    getCompaniesForTenant(tenantUuid),
  ]);

  const companies: SerializedCompany[] = rawCompanies.map((c) => ({
    name: c.name,
    sector: c.sector,
    risks: c.risks.map((r) => ({ status: r.status })),
    policies: c.policies.map((p) => ({ status: p.status })),
    industry_avg_loss_cents:
      c.industry_avg_loss_cents != null ? Number(c.industry_avg_loss_cents) : null,
  }));

  return (
    <GlobalHealthSummaryCardClient
      companies={companies}
      telemetryData={telemetryData}
      sustainabilityImpact={sustainabilityImpact}
      coreintelTrendActive={coreintelTrendActive}
    />
  );
}
