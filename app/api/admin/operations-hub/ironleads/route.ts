import { NextRequest, NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { researchBuyingCommitteeForAllSuspects } from "@/app/lib/server/ironleadsBuyingCommitteeResearchCore";
import {
  redactIronleadsPortalSnapshot,
} from "@/app/lib/server/operationsApiRedaction";
import {
  buildIronleadsPortalSnapshot,
  triggerIronleadsHarvest,
} from "@/app/lib/server/operationsTeamPortalsCore";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const snapshot = await buildIronleadsPortalSnapshot();
  return NextResponse.json(redactIronleadsPortalSnapshot(snapshot));
}

export async function POST(request: NextRequest) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  let body: {
    action?: string;
    scoutOnly?: boolean;
    skipIngress?: boolean;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  if (body.action === "research_buying_committee") {
    const research = await researchBuyingCommitteeForAllSuspects();
    const snapshot = await buildIronleadsPortalSnapshot();
    return NextResponse.json({
      ok: true,
      research: {
        researchedAt: research.researchedAt,
        total: research.total,
        researched: research.researched,
        skipped: research.skipped,
        results: research.results.map((row) => ({
          contactId: row.contactId,
          company: row.company,
          skipped: row.skipped,
          skipReason: row.skipReason,
          memberRoles: row.members.map((m) => m.role),
          memberCount: row.members.length,
        })),
      },
      snapshot: redactIronleadsPortalSnapshot(snapshot),
    });
  }

  const result = await triggerIronleadsHarvest(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Harvest failed" }, { status: 502 });
  }

  const snapshot = await buildIronleadsPortalSnapshot();
  return NextResponse.json({
    ok: true,
    harvest: result.result,
    snapshot: redactIronleadsPortalSnapshot(snapshot),
  });
}
