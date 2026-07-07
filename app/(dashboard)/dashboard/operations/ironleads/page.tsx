import { redirect } from "next/navigation";

import { canUsePlatformAdminTools } from "@/app/lib/auth/platformAdminAccess";

import IronleadsPortalClient from "./IronleadsPortalClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ironleads Portal | Ironframe Operations",
  description: "SUSPECT-stage OSINT harvest and lead intake console for Ironleads.",
};

export default async function IronleadsPortalPage() {
  const allowed = await canUsePlatformAdminTools();
  if (!allowed) {
    redirect("/unauthorized");
  }

  return <IronleadsPortalClient />;
}
