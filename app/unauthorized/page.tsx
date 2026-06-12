import AccessPending from "@/app/components/AccessPending";
import { resolveDashboardAccess } from "@/app/lib/auth/dashboardRoleAccess";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Access Pending | Ironframe",
  description: "Workspace role provisioning required before command center access.",
};

export default async function UnauthorizedPage() {
  const access = await resolveDashboardAccess();

  if (access.status === "allowed") {
    redirect("/integrity");
  }

  if (access.status === "unauthenticated") {
    redirect("/login");
  }

  const user = await getSupabaseSessionUser();

  return (
    <AccessPending email={user?.email ?? null} tenantUuid={access.tenantUuid} />
  );
}
