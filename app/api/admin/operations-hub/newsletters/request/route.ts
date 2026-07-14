import { NextRequest, NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { requestGovernanceNewsletterSeriesCore } from "@/app/lib/server/requestGovernanceNewsletterSeriesCore";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DEFAULT_SERIES_TITLE =
  "Why we built Ironframe — origin-story newsletter series (value & intent, not implementation)";

const DEFAULT_ISSUES = [
  {
    filename: "2026-07-14-draft-newsletter-why-ironframe.md",
    issueLabel: "Issue 1 — Why Ironframe exists",
    focus:
      "Control-first creation story: what broke in legacy GRC/risk ops and why a new command post was necessary.",
  },
  {
    filename: "2026-07-14-draft-newsletter-quantitative-risk.md",
    issueLabel: "Issue 2 — Quantitative risk over heatmaps",
    focus:
      "Why defensible financial-risk intent (ALE) replaces qualitative color theaters for operators and boards.",
  },
  {
    filename: "2026-07-14-draft-newsletter-tenant-sovereignty.md",
    issueLabel: "Issue 3 — Tenant sovereignty & specialized services",
    focus:
      "Why multi-entity isolation and purpose-built services beat a monolithic AI GRC wrapper — without exposing implementation.",
  },
] as const;

/**
 * Submit an Ironcast newsletter series request.
 * Authorship generates quarantine drafts into docs/briefing-queue/ for Ops Hub review.
 * Human promote + syndicate remain required — this route never compiles email HTML.
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
      { error: "requestPrompt must describe the newsletter series (min 40 characters)." },
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

  const result = await requestGovernanceNewsletterSeriesCore({
    requestPrompt,
    seriesTitle: String(body.seriesTitle ?? DEFAULT_SERIES_TITLE).trim() || DEFAULT_SERIES_TITLE,
    issues: [...DEFAULT_ISSUES],
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    overwrite: body.overwrite === true,
  });

  return NextResponse.json(
    {
      ...result,
      operator: auth.userId,
      message: result.ok
        ? `Generated and staged ${result.staged.length} newsletter draft(s). Review in Briefings, then promote & syndicate.`
        : `Newsletter request completed with failures (staged=${result.staged.length}, failed=${result.failed.length}).`,
    },
    { status: result.ok ? 201 : 400 },
  );
}
