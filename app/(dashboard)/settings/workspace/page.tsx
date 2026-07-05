import { redirect } from "next/navigation";

import WorkspaceSettingsClient from "@/app/(dashboard)/settings/workspace/WorkspaceSettingsClient";
import { canEditWorkspaceProfile } from "@/app/lib/auth/workspaceProfileEditorAccess";
import {
  ensureDashboardTenantSession,
  resolveDashboardAccess,
} from "@/app/lib/auth/dashboardRoleAccess";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function centsToDraftDollars(cents: bigint): string {
  const abs = cents < 0n ? -cents : cents;
  const dollars = abs / 100n;
  const frac = abs % 100n;
  const fracStr = frac < 10n ? `0${frac}` : `${frac}`;
  const sign = cents < 0n ? "-" : "";
  return `${sign}${dollars}.${fracStr}`;
}

export default async function WorkspaceSettingsPage() {
  const access = await ensureDashboardTenantSession(await resolveDashboardAccess());
  if (access.status !== "allowed") {
    redirect("/login");
  }

  const tenantUuid = access.tenantUuid;
  const canEdit = await canEditWorkspaceProfile(access.userId, tenantUuid);

  const [tenant, primaryCompany] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantUuid },
      select: { name: true, ale_baseline: true, industry: true },
    }),
    prisma.company.findFirst({
      where: { tenantId: tenantUuid, isTestRecord: false },
      orderBy: { id: "asc" },
      select: {
        name: true,
        sector: true,
        departments: { select: { name: true }, orderBy: { name: "asc" } },
      },
    }),
  ]);

  const aleBaselineCents = tenant?.ale_baseline?.toString() ?? "0";
  const departmentsRaw =
    primaryCompany?.departments.map((row) => row.name).join(", ") ?? "";

  return (
    <WorkspaceSettingsClient
      tenantName={tenant?.name ?? "Workspace"}
      aleBaselineCents={aleBaselineCents}
      aleDraftDollars={centsToDraftDollars(BigInt(aleBaselineCents))}
      companyName={primaryCompany?.name ?? tenant?.name ?? ""}
      sector={primaryCompany?.sector ?? tenant?.industry ?? ""}
      departmentsRaw={departmentsRaw}
      hasPrimaryCompany={Boolean(primaryCompany)}
      canEdit={canEdit}
    />
  );
}
