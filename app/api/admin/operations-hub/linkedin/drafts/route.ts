import { NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { listLinkedInDeskDraftsCore } from "@/app/lib/server/linkedinDeskDraftCore";

export const dynamic = "force-dynamic";

/**
 * List LinkedIn founder drafts (Mon / Wed / Fri) for the Publishing Desk.
 * Seeds catalog defaults when a slot has never been saved. Does not promote
 * or post to LinkedIn.
 */
export async function GET() {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  try {
    const result = await listLinkedInDeskDraftsCore();
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list LinkedIn drafts.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
