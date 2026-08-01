import { Suspense } from "react";
import { redirect } from "next/navigation";

import { canUsePerimeterWorkforceFromSession } from "@/app/lib/auth/perimeterWorkforceAccess";

import PublishingDeskClient from "./PublishingDeskClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Publishing Desk | Ironframe Operations",
  description:
    "Quarantine → Approve / Deny → syndicate for Governance Frame briefings and Ironcast newsletters.",
};

export default async function PublishingDeskPage() {
  const allowed = await canUsePerimeterWorkforceFromSession();
  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#020617] p-8 text-slate-400">
          Loading publishing desk…
        </div>
      }
    >
      <PublishingDeskClient />
    </Suspense>
  );
}
