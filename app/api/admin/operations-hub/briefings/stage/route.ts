import { NextRequest, NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { ensureQueueReviewActivity } from "@/app/lib/server/opsScheduleCore";
import {
  stageBriefingQueueDraftBatch,
  stageBriefingQueueDraftCore,
} from "@/app/lib/server/stageBriefingQueueDraftCore";

export const dynamic = "force-dynamic";

/**
 * Stage one or more Governance Frame drafts into docs/briefing-queue/ for Ops Hub review.
 * Does not promote or syndicate — human promote remains the publication gate.
 */
export async function POST(request: NextRequest) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  let body: {
    filename?: string;
    markdown?: string;
    overwrite?: boolean;
    drafts?: Array<{ filename?: string; markdown?: string; overwrite?: boolean }>;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (Array.isArray(body.drafts) && body.drafts.length > 0) {
    const result = stageBriefingQueueDraftBatch(
      body.drafts.map((draft) => ({
        filename: draft.filename ?? "",
        markdown: draft.markdown ?? "",
        overwrite: draft.overwrite === true || body.overwrite === true,
      })),
    );
    if (result.ok) {
      await Promise.all(
        result.staged.map((draft) =>
          ensureQueueReviewActivity({ filename: draft.filename }).catch((err) => {
            console.warn("[briefings/stage] schedule activity skipped", draft.filename, err);
          }),
        ),
      );
    }
    return NextResponse.json(
      {
        ...result,
        operator: auth.userId,
        message:
          result.ok
            ? `Staged ${result.staged.length} draft(s) into briefing-queue for review.`
            : `Staged ${result.staged.length}; failed ${result.failed.length}.`,
      },
      { status: result.ok ? 201 : 400 },
    );
  }

  const result = stageBriefingQueueDraftCore({
    filename: body.filename ?? "",
    markdown: body.markdown ?? "",
    overwrite: body.overwrite === true,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  await ensureQueueReviewActivity({ filename: result.filename }).catch((err) => {
    console.warn("[briefings/stage] schedule activity skipped", result.filename, err);
  });

  return NextResponse.json(
    {
      ...result,
      operator: auth.userId,
      message: `Staged ${result.filename} — review in Briefings, then promote.`,
    },
    { status: 201 },
  );
}
