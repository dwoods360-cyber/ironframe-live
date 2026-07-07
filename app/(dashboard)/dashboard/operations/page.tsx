import { Suspense } from "react";
import { redirect } from "next/navigation";

import { canUsePerimeterWorkforceFromSession } from "@/app/lib/auth/perimeterWorkforceAccess";

import OperationsHubClient from "./OperationsHubClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Operations Command Center | Ironframe Admin",
  description:
    "Ironframe-internal console for perimeter workforce apps (:8082–:8086) — GLOBAL_ADMIN or designated BUSINESS_ADMIN only; not tenant workspaces.",
};

export default async function OperationsHubPage() {
  const allowed = await canUsePerimeterWorkforceFromSession();
  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#020617] p-8 text-slate-400">
          Loading operations command center…
        </div>
      }
    >
      <OperationsHubClient />
    </Suspense>
  );
}
