import { NextRequest, NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { runGovernanceFramePublicationDesk } from "@/app/lib/server/governanceFramePublicationDeskCore";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Run the Governance Frame publication desk (author or review).
 * Stages quarantine drafts and desk-review sidecars only — never promotes.
 */
export async function POST(request: NextRequest) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  let body: {
    mode?: "author" | "review";
    filename?: string;
    requestPrompt?: string;
    title?: string;
    tenantSlug?: string;
    overwrite?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const mode = body.mode === "review" ? "review" : "author";
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

  const result = await runGovernanceFramePublicationDesk({
    mode,
    filename: body.filename,
    requestPrompt: body.requestPrompt,
    title: body.title,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    overwrite: body.overwrite === true,
  });

  return NextResponse.json(
    {
      ...result,
      operator: auth.userId,
      message: result.ok
        ? result.mode === "author"
          ? `Desk authored and staged ${result.filename}. Human Approve remains required.`
          : `Desk review recorded for ${result.filename}. Human Approve remains required.`
        : result.error ?? "Desk run failed.",
    },
    { status: result.ok ? (result.mode === "author" ? 201 : 200) : 400 },
  );
}
