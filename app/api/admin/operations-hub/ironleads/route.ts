import { NextRequest, NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { researchBuyingCommitteeForAllSuspects } from "@/app/lib/server/ironleadsBuyingCommitteeResearchCore";
import {
  importMsspDirectoryAccounts,
  importMsspFreeDirectorySeeds,
  listMsspFreeDirectorySeeds,
  parseDirectoryImportPaste,
} from "@/app/lib/server/ironleadsMsspDirectoryImportCore";
import {
  parkExcessActiveToPending,
  pullPendingSuspectBatch,
} from "@/app/lib/server/ironleadsPendingPoolCore";
import {
  redactIronleadsPortalSnapshot,
} from "@/app/lib/server/operationsApiRedaction";
import {
  buildIronleadsPortalSnapshot,
  triggerIronleadsHarvest,
} from "@/app/lib/server/operationsTeamPortalsCore";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const snapshot = await buildIronleadsPortalSnapshot();
  return NextResponse.json({
    ...redactIronleadsPortalSnapshot(snapshot),
    directorySeeds: listMsspFreeDirectorySeeds().map((s) => ({
      companyName: s.companyName,
      websiteUrl: s.websiteUrl,
      directorySource: s.directorySource,
    })),
  });
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
    /** Default false — harvest auto-runs buying-committee research for operator review. */
    skipBuyingCommitteeResearch?: boolean;
    paste?: string;
    runResearchAfterImport?: boolean;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const formatResearch = (
    research: Awaited<ReturnType<typeof researchBuyingCommitteeForAllSuspects>>,
  ) => ({
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
  });

  if (body.action === "research_buying_committee") {
    const research = await researchBuyingCommitteeForAllSuspects();
    const snapshot = await buildIronleadsPortalSnapshot();
    return NextResponse.json({
      ok: true,
      research: formatResearch(research),
      snapshot: redactIronleadsPortalSnapshot(snapshot),
    });
  }

  if (body.action === "pull_pending_batch") {
    const pulled = await pullPendingSuspectBatch(20);
    let research: ReturnType<typeof formatResearch> | null = null;
    if (body.runResearchAfterImport === true && pulled.pulled > 0) {
      research = formatResearch(await researchBuyingCommitteeForAllSuspects());
    }
    const snapshot = await buildIronleadsPortalSnapshot();
    return NextResponse.json({
      ok: true,
      pull: pulled,
      research,
      snapshot: redactIronleadsPortalSnapshot(snapshot),
    });
  }

  if (body.action === "park_excess_active") {
    const parked = await parkExcessActiveToPending();
    const snapshot = await buildIronleadsPortalSnapshot();
    return NextResponse.json({
      ok: true,
      park: parked,
      snapshot: redactIronleadsPortalSnapshot(snapshot),
    });
  }

  if (body.action === "import_free_directory_seeds") {
    const imported = await importMsspFreeDirectorySeeds();
    // Default OFF — auto-research-all times out and leaves the queue looking empty.
    let research: ReturnType<typeof formatResearch> | null = null;
    if (body.runResearchAfterImport === true) {
      research = formatResearch(await researchBuyingCommitteeForAllSuspects());
    }
    const snapshot = await buildIronleadsPortalSnapshot();
    return NextResponse.json({
      ok: true,
      import: imported,
      research,
      snapshot: redactIronleadsPortalSnapshot(snapshot),
    });
  }

  if (body.action === "import_directory_paste") {
    const pasteRaw = typeof body.paste === "string" ? body.paste : "";
    const rows = parseDirectoryImportPaste(pasteRaw);
    if (rows.length === 0) {
      const nonEmptyLines = pasteRaw
        .split(/\r\n|\n|\r/)
        .map((l) => l.trim())
        .filter(Boolean).length;
      return NextResponse.json(
        {
          error:
            nonEmptyLines > 0
              ? `Could not parse any firms from ${nonEmptyLines} non-empty line(s). Use one company per line (optional: company, https://site.com).`
              : "Paste is empty. Use one company per line (optional website after a comma).",
          hint: "Example:\nCyberDuo, https://www.cyberduo.com\nNopalCyber",
        },
        { status: 400 },
      );
    }
    if (rows.length > 100) {
      return NextResponse.json(
        {
          error: `Max 100 rows per paste import (got ${rows.length}). Split your text file into batches of 100.`,
        },
        { status: 400 },
      );
    }
    const imported = await importMsspDirectoryAccounts(rows);
    // Default OFF — use Research only after import; bundling research-all often times out.
    let research: ReturnType<typeof formatResearch> | null = null;
    if (body.runResearchAfterImport === true) {
      research = formatResearch(await researchBuyingCommitteeForAllSuspects());
    }
    const snapshot = await buildIronleadsPortalSnapshot();
    return NextResponse.json({
      ok: true,
      import: imported,
      research,
      snapshot: redactIronleadsPortalSnapshot(snapshot),
    });
  }

  const result = await triggerIronleadsHarvest(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Harvest failed" }, { status: 502 });
  }

  let research: ReturnType<typeof formatResearch> | null = null;
  if (!body.skipBuyingCommitteeResearch) {
    const researchRaw = await researchBuyingCommitteeForAllSuspects();
    research = formatResearch(researchRaw);
  }

  const snapshot = await buildIronleadsPortalSnapshot();
  return NextResponse.json({
    ok: true,
    harvest: result.result,
    research,
    snapshot: redactIronleadsPortalSnapshot(snapshot),
  });
}
