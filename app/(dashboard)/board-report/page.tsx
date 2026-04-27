import { unstable_noStore as noStore } from "next/cache";
import { getBoardReportPayload } from "@/lib/reporting/boardReportQueries";
import BoardReportClient from "./BoardReportClient";
import prisma from "@/lib/prisma";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { isRemoteAccessAdminEligible } from "@/app/utils/serverAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Board Report | Ironframe",
  description: "Executive operational readiness, financial simulation posture, and governance audit trail.",
};

export default async function BoardReportPage() {
  noStore();
  const [data, tenantName, canApproveCommentary] = await Promise.all([
    getBoardReportPayload(),
    (async () => {
      const tenantId = await getActiveTenantUuidFromCookies();
      const t = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      });
      return t?.name ?? "Medshield Health";
    })(),
    isRemoteAccessAdminEligible(),
  ]);
  const isDevelopment = process.env.NODE_ENV === "development";
  // Readiness alert: `data.statusState === "BREACHED"` when `data.currentReadinessScore < data.targetReadinessScore`
  // (threshold from `SimulationConfig.targetReadinessScore`). Client gauge + `useBoardReadinessStatusStore` reflect this.
  return (
    <BoardReportClient
      data={data}
      isDevelopment={isDevelopment}
      tenantName={tenantName}
      canApproveCommentary={canApproveCommentary}
    />
  );
}
