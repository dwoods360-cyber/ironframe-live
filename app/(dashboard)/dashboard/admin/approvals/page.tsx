import { redirect } from "next/navigation";

import { canUsePerimeterWorkforceFromSession } from "@/app/lib/auth/perimeterWorkforceAccess";

import AdminApprovalDashboardClient from "./AdminApprovalDashboardClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Agent Messaging Approvals | Ironframe Admin",
  description: "Human-in-the-loop gatekeeper queue for customer service draft dispatch.",
};

export default async function AdminApprovalsPage() {
  const allowed = await canUsePerimeterWorkforceFromSession();
  if (!allowed) {
    redirect("/unauthorized");
  }

  return <AdminApprovalDashboardClient />;
}
