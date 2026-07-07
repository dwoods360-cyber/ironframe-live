import { redirect } from "next/navigation";

import { canUsePerimeterWorkforceFromSession } from "@/app/lib/auth/perimeterWorkforceAccess";

import SupportIntakePortalClient from "./SupportIntakePortalClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Support Intake Portal | Ironframe Operations",
  description: "Internal operator console for support intake queue and SUPPORT approvals.",
};

export default async function SupportIntakePortalPage() {
  const allowed = await canUsePerimeterWorkforceFromSession();
  if (!allowed) {
    redirect("/unauthorized");
  }

  return <SupportIntakePortalClient />;
}
