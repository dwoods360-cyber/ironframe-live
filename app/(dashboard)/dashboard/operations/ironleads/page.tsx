import { redirect } from "next/navigation";

import { canUsePerimeterWorkforceFromSession } from "@/app/lib/auth/perimeterWorkforceAccess";

import IronleadsPortalClient from "./IronleadsPortalClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ironleads Portal | Ironframe Operations",
  description: "SUSPECT-stage OSINT harvest and lead intake console for Ironleads.",
};

type PageProps = {
  searchParams: Promise<{
    promoted?: string;
    held?: string;
    restored?: string;
    discarded?: string;
    company?: string;
  }>;
};

export default async function IronleadsPortalPage({ searchParams }: PageProps) {
  const allowed = await canUsePerimeterWorkforceFromSession();
  if (!allowed) {
    redirect("/unauthorized");
  }

  const query = await searchParams;
  const decision =
    query.promoted?.trim()
      ? ({ kind: "promoted" as const, contactId: query.promoted.trim() })
      : query.held?.trim()
        ? ({ kind: "held" as const, contactId: query.held.trim() })
        : query.restored?.trim()
          ? ({ kind: "restored" as const, contactId: query.restored.trim() })
          : query.discarded?.trim()
            ? ({ kind: "discarded" as const, contactId: query.discarded.trim() })
            : null;

  return (
    <IronleadsPortalClient
      queueDecision={decision}
      queueDecisionCompany={query.company?.trim() || null}
    />
  );
}
