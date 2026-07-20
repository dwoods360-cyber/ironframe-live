import { NextRequest, NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { requestGovernanceBriefingSeriesCore } from "@/app/lib/server/requestGovernanceBriefingSeriesCore";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DEFAULT_SERIES_TITLE =
  "Control-first GRC: how financial-risk defensibility replaced checklist compliance, 2000–2026";

const DEFAULT_ERAS = [
  {
    filename: "2026-01-15-draft-market-grc-2000-2008.md",
    eraLabel: "Part 1 — Checklist foundations",
    yearRange: "2000–2008",
  },
  {
    filename: "2026-02-12-draft-market-grc-2009-2018.md",
    eraLabel: "Part 2 — Cloud migration and the checklist industrial complex",
    yearRange: "2009–2018",
  },
  {
    filename: "2026-03-12-draft-market-grc-2019-today.md",
    eraLabel: "Part 3 — Quantitative GRC and agentic enforcement",
    yearRange: "2019–today",
  },
] as const;

/**
 * Submit a Governance Frame briefing series request.
 * Assigned authorship generates quarantine drafts into docs/briefing-queue/ for Ops Hub review.
 * Human promote remains required — this route never syndicates.
 */
export async function POST(request: NextRequest) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  let body: {
    requestPrompt?: string;
    seriesTitle?: string;
    tenantSlug?: string;
    overwrite?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const requestPrompt = String(body.requestPrompt ?? "").trim();
  if (requestPrompt.length < 40) {
    return NextResponse.json(
      { error: "requestPrompt must describe the series (min 40 characters)." },
      { status: 400 },
    );
  }

  const tenantSlug = String(body.tenantSlug ?? "ironframe-sandbox").trim().toLowerCase();
  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug },
    select: { id: true, slug: true },
  });
  if (!tenant) {
    return NextResponse.json(
      { error: `Tenant slug not found for frontmatter binding: ${tenantSlug}` },
      { status: 400 },
    );
  }

  const result = await requestGovernanceBriefingSeriesCore({
    requestPrompt,
    seriesTitle: String(body.seriesTitle ?? DEFAULT_SERIES_TITLE).trim() || DEFAULT_SERIES_TITLE,
    eras: [...DEFAULT_ERAS],
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    overwrite: body.overwrite === true,
  });

  return NextResponse.json(
    {
      ...result,
      operator: auth.userId,
      message: result.ok
        ? `Generated and staged ${result.staged.length} draft(s). Review in Briefings, then promote.`
        : `Request completed with failures (staged=${result.staged.length}, failed=${result.failed.length}).`,
    },
    { status: result.ok ? 201 : 400 },
  );
}
