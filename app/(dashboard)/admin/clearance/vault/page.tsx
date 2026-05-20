import { unstable_noStore as noStore } from "next/cache";
import prisma from "@/lib/prisma";
import { CLEARANCE_QUEUE_STATUSES } from "@/app/utils/clearanceQueue";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import AdminClearanceClient, { type ClearanceThreatRow } from "./AdminClearanceClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Administrative Clearance Gateway | Ironframe",
  description: "Epic 11.4 Bank Vault dual-gate supervisor release for pipeline threats.",
};

export default async function AdminClearanceVaultPage() {
  noStore();

  const tenantUuid = await getActiveTenantUuidFromCookies();
  const user = await getSupabaseSessionUser();
  const operatorId = user?.id?.trim() || "SYSTEM_OPERATOR";

  const company = await prisma.company.findFirst({
    where: { tenantId: tenantUuid },
    orderBy: { id: "asc" },
    select: { id: true },
  });

  const queue = company
    ? await prisma.threatEvent.findMany({
        where: {
          status: { in: CLEARANCE_QUEUE_STATUSES },
          tenantCompanyId: company.id,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
        },
      })
    : [];

  const initialThreats: ClearanceThreatRow[] = queue.map((t) => ({
    id: t.id,
    tenantId: tenantUuid,
    title: t.title,
    status: t.status,
  }));

  return (
    <AdminClearanceClient
      initialThreats={initialThreats}
      tenantId={tenantUuid}
      operatorId={operatorId}
    />
  );
}
