import { redirect } from "next/navigation";

import { canUsePerimeterWorkforceFromSession } from "@/app/lib/auth/perimeterWorkforceAccess";

export const dynamic = "force-dynamic";

/** Talk track lives on the LIVE desk — keep this URL as a stable bookmark redirect. */
export default async function WorkflowReviewProtocolRedirectPage() {
  const allowed = await canUsePerimeterWorkforceFromSession();
  if (!allowed) {
    redirect("/unauthorized");
  }
  redirect("/dashboard/operations/workflow-review#talk-track");
}
