import { redirect } from "next/navigation";

import { canUsePerimeterWorkforceFromSession } from "@/app/lib/auth/perimeterWorkforceAccess";

import AdminApprovalDashboardClient from "./AdminApprovalDashboardClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Agent Messaging Approvals | Ironframe Admin",
  description:
    "HITL gatekeeper for Sales outreach, Support replies, and Customer Success advisories — one desk, three tracks.",
};

export default async function AdminApprovalsPage() {
  const allowed = await canUsePerimeterWorkforceFromSession();
  if (!allowed) {
    redirect("/unauthorized");
  }

  return <AdminApprovalDashboardClient />;
}
