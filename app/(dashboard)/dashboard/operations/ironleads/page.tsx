import { redirect } from "next/navigation";

import { canUsePerimeterWorkforceFromSession } from "@/app/lib/auth/perimeterWorkforceAccess";

import IronleadsPortalClient from "./IronleadsPortalClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ironleads Portal | Ironframe Operations",
  description: "SUSPECT-stage OSINT harvest and lead intake console for Ironleads.",
};

export default async function IronleadsPortalPage() {
  const allowed = await canUsePerimeterWorkforceFromSession();
  if (!allowed) {
    redirect("/unauthorized");
  }

  return <IronleadsPortalClient />;
}
