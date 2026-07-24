import { redirect } from "next/navigation";

import { canUsePerimeterWorkforceFromSession } from "@/app/lib/auth/perimeterWorkforceAccess";

import WorkflowReviewCallClient from "./WorkflowReviewCallClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Workflow review LIVE call assist | Ironframe Operations",
  description:
    "In-call Design Partner workflow review sidecar — live transcript, Q&A pocket answers, and buying-sign detection while you host.",
};

export default async function WorkflowReviewCallPage() {
  const allowed = await canUsePerimeterWorkforceFromSession();
  if (!allowed) {
    redirect("/unauthorized");
  }

  return <WorkflowReviewCallClient />;
}
