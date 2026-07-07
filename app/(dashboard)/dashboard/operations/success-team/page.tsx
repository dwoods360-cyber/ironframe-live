import { redirect } from "next/navigation";

import { canUsePlatformAdminTools } from "@/app/lib/auth/platformAdminAccess";

import SuccessTeamPortalClient from "./SuccessTeamPortalClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "IronSuccessTeam Portal | Ironframe Operations",
  description: "CLOSED_WON account health and customer success advisory console.",
};

export default async function SuccessTeamPortalPage() {
  const allowed = await canUsePlatformAdminTools();
  if (!allowed) {
    redirect("/unauthorized");
  }

  return <SuccessTeamPortalClient />;
}
