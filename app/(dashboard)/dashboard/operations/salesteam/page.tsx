import { redirect } from "next/navigation";

import { canUsePerimeterWorkforceFromSession } from "@/app/lib/auth/perimeterWorkforceAccess";

import SalesteamPortalClient from "./SalesteamPortalClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "SalesTeam Portal | Ironframe Operations",
  description: "PROSPECT-stage outbound draft console for SalesTeam perimeter worker.",
};

export default async function SalesteamPortalPage() {
  const allowed = await canUsePerimeterWorkforceFromSession();
  if (!allowed) {
    redirect("/unauthorized");
  }

  return <SalesteamPortalClient />;
}
