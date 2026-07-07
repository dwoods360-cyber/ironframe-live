import { redirect } from "next/navigation";

import { canUsePerimeterWorkforceFromSession } from "@/app/lib/auth/perimeterWorkforceAccess";

import IronboardPortalClient from "./IronboardPortalClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "IronBoard Boardroom | Ironframe Operations",
  description:
    "GLOBAL_ADMIN executive boardroom — 17-agent roster, CRM tools, and market flywheel.",
};

export default async function IronboardPortalPage() {
  const allowed = await canUsePerimeterWorkforceFromSession();
  if (!allowed) {
    redirect("/unauthorized");
  }

  return <IronboardPortalClient />;
}
