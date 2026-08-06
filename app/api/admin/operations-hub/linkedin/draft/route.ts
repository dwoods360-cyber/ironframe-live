import { NextRequest, NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import {
  loadLinkedInDeskDraftCore,
  saveLinkedInDeskDraftCore,
} from "@/app/lib/server/linkedinDeskDraftCore";

export const dynamic = "force-dynamic";

/**
 * Operator LinkedIn draft workbench — load paste-ready founder copy (title + body).
 * Pass ?seed=suggested to force-load the heatmap vs dollars draft.
 */
export async function GET(request: NextRequest) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const seedSuggested =
    request.nextUrl.searchParams.get("seed")?.trim().toLowerCase() === "suggested";

  try {
    const result = await loadLinkedInDeskDraftCore({ seedSuggested });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load LinkedIn draft.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Operator LinkedIn draft workbench — save title + body to APP_DOCS.
 * Does not promote to Governance Frame or auto-post to LinkedIn.
 */
export async function PUT(request: NextRequest) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  let body: { title?: string; body?: string; markdown?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const result = await saveLinkedInDeskDraftCore({
      title: body.title,
      body: body.body,
      markdown: body.markdown,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(
      {
        ...result,
        operator: auth.userId,
        message: result.repoSynced
          ? "Saved title + draft to APP_DOCS and local repo file."
          : "Saved title + draft to APP_DOCS. Copy body into LinkedIn when ready.",
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save LinkedIn draft.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
