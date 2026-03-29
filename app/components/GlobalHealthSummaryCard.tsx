import GlobalHealthSummaryCardClient, {
  type SerializedCompany,
} from "./GlobalHealthSummaryCardClient";
import { getGlobalTelemetry } from "@/app/actions/dashboardActions";
import prisma from "@/lib/prisma";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

export type { SerializedCompany };

export interface GlobalHealthSummaryCardProps {
  coreintelTrendActive?: boolean;
}

export default async function GlobalHealthSummaryCard({
  coreintelTrendActive = false,
}: GlobalHealthSummaryCardProps) {
  const tenantUuid = await getActiveTenantUuidFromCookies();
  const [telemetryData, rawCompanies] = await Promise.all([
    getGlobalTelemetry(),
    prisma.company.findMany({
      where: { tenantId: tenantUuid },
      include: { policies: true, risks: true },
    }),
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
      coreintelTrendActive={coreintelTrendActive}
    />
  );
}
