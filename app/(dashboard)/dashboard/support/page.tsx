import { canUsePerimeterWorkforceFromSession } from "@/app/lib/auth/perimeterWorkforceAccess";

import SupportPortalClient from "@/app/(dashboard)/dashboard/support/SupportPortalClient";

export const metadata = {
  title: "Support Portal | Ironframe",
  description: "View and submit engineering support tickets for your workspace.",
};

export default async function SupportPortalPage() {
  const showOperatorLinks = await canUsePerimeterWorkforceFromSession();

  return <SupportPortalClient showOperatorLinks={showOperatorLinks} />;
}
