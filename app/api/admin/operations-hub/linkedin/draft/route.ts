import { NextRequest, NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import {
  loadLinkedInDeskDraftCore,
  saveLinkedInDeskDraftCore,
} from "@/app/lib/server/linkedinDeskDraftCore";

export const dynamic = "force-dynamic";

/**
 * Operator LinkedIn draft workbench — load one catalog slot.
 * Query: ?id=fri-collection|mon-heatmap|wed-product-demo
 * Legacy: ?seed=suggested|friday|monday
 */
export async function GET(request: NextRequest) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const seed = request.nextUrl.searchParams.get("seed")?.trim().toLowerCase() ?? "";
  const id = request.nextUrl.searchParams.get("id")?.trim() ?? "";
  const resetTemplate =
    request.nextUrl.searchParams.get("reset")?.trim().toLowerCase() === "1" ||
    request.nextUrl.searchParams.get("reset")?.trim().toLowerCase() === "true";
  const seedSuggested = seed === "suggested";
  const seedFriday = seed === "friday" || seed === "fri";
  const seedMonday = seed === "monday" || seed === "mon" || seed === "heatmap";

  try {
    const result = await loadLinkedInDeskDraftCore({
      id: id || undefined,
      seedSuggested,
      seedFriday,
      seedMonday,
      resetTemplate,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load LinkedIn draft.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Save one LinkedIn catalog draft (title + body + research) to APP_DOCS.
 */
export async function PUT(request: NextRequest) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  let body: {
    id?: string;
    title?: string;
    body?: string;
    research?: string;
    markdown?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const result = await saveLinkedInDeskDraftCore({
      id: body.id,
      title: body.title,
      body: body.body,
      research: body.research,
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
          ? `Saved ${result.slotLabel} draft to APP_DOCS and local repo file.`
          : `Saved ${result.slotLabel} draft to APP_DOCS. Copy body into LinkedIn when ready.`,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save LinkedIn draft.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
