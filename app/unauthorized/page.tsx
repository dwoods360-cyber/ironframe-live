import AccessPending from "@/app/components/AccessPending";
import { resolvePublicAppUrl } from "@/app/lib/auth/publicAppUrl";
import { resolveDashboardAccess } from "@/app/lib/auth/dashboardRoleAccess";
import { resolveWorkspaceAccessDenial } from "@/app/lib/server/resolveWorkspaceAccessDenial";
import { resolvePostAuthLandingPath } from "@/app/lib/tenantSubdomain";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Workspace Access | Ironframe",
  description: "Workspace access status before command center entry.",
};

export default async function UnauthorizedPage() {
  const access = await resolveDashboardAccess();

  if (access.status === "allowed") {
    const h = await headers();
    redirect(resolvePostAuthLandingPath(h.get("host")));
  }

  if (access.status === "unauthenticated") {
    redirect("/login");
  }

  const user = await getSupabaseSessionUser();
  const denial = await resolveWorkspaceAccessDenial({
    userId: access.userId,
    email: user?.email ?? null,
    tenantUuid: access.tenantUuid,
  });

  const apexOrigin = resolvePublicAppUrl().replace(/\/+$/, "");

  return (
    <AccessPending
      email={user?.email ?? null}
      tenantUuid={denial.tenantUuid}
      tenantSlug={denial.tenantSlug}
      tenantName={denial.tenantName}
      reason={denial.reason}
      assignedWorkspaces={denial.assignedWorkspaces}
      apexLoginUrl={`${apexOrigin}/login`}
      integrityHubUrl={`${apexOrigin}/integrity`}
    />
  );
}
