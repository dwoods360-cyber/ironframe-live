import { redirect } from "next/navigation";

import { canUsePlatformAdminTools } from "@/app/lib/auth/platformAdminAccess";

import OperationsHubClient from "./OperationsHubClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Operations Command Center | Ironframe Admin",
  description:
    "Unified platform console for Ironboard, Ironleads, SalesTeam, IronSuccessTeam, CRM, approvals, and public briefings.",
};

export default async function OperationsHubPage() {
  const allowed = await canUsePlatformAdminTools();
  if (!allowed) {
    redirect("/unauthorized");
  }

  return <OperationsHubClient />;
}
