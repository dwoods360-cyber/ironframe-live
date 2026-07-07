import { redirect } from "next/navigation";

import { canUsePlatformAdminTools } from "@/app/lib/auth/platformAdminAccess";

import IronboardPortalClient from "./IronboardPortalClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "IronBoard Boardroom | Ironframe Operations",
  description:
    "GLOBAL_ADMIN executive boardroom — 17-agent roster, CRM tools, and market flywheel.",
};

export default async function IronboardPortalPage() {
  const allowed = await canUsePlatformAdminTools();
  if (!allowed) {
    redirect("/unauthorized");
  }

  return <IronboardPortalClient />;
}
