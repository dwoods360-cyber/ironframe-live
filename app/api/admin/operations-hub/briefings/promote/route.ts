import { NextRequest, NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { promoteBriefingDraftCore } from "@/app/lib/server/promoteBriefingDraftCore";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  let body: {
    filename?: string;
    slug?: string;
    skipSyndication?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = await promoteBriefingDraftCore({
    filename: body.filename ?? "",
    slug: body.slug ?? "",
    operator: auth.userId,
    skipSyndication: body.skipSyndication === true,
  });

  if (!result.ok) {
    const issueText =
      result.issues
        ?.filter((issue) => issue.severity === "error")
        .map((issue) => `${issue.code}: ${issue.message}`)
        .join(" · ") ?? "";
    return NextResponse.json(
      {
        ...result,
        error: [result.error, issueText].filter(Boolean).join(" — "),
      },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      ...result,
      message: `Approved & promoted to /governance-frame/${result.slug}${
        result.removedFromQueue ? "" : " (queue file still on disk — remove manually if needed)"
      }`,
    },
    { status: 201 },
  );
}
