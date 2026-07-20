import { NextRequest, NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { resolvePublicAppUrl } from "@/app/lib/auth/publicAppUrl";
import { completeTeamsOAuth } from "@/app/lib/server/teamsGraphAuth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requirePerimeterWorkforceOperator();
  const base = resolvePublicAppUrl().replace(/\/$/, "");
  const reviewPath = `${base}/dashboard/operations/workflow-review`;

  if ("error" in auth) {
    return NextResponse.redirect(
      `${reviewPath}?teams=error&message=${encodeURIComponent(auth.error)}`,
    );
  }

  const code = request.nextUrl.searchParams.get("code")?.trim() ?? "";
  const state = request.nextUrl.searchParams.get("state")?.trim() ?? "";
  const oauthError = request.nextUrl.searchParams.get("error_description")
    || request.nextUrl.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      `${reviewPath}?teams=error&message=${encodeURIComponent(oauthError)}`,
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${reviewPath}?teams=error&message=${encodeURIComponent("Missing OAuth code or state.")}`,
    );
  }

  const result = await completeTeamsOAuth({ code, state, userId: auth.userId });
  if ("error" in result) {
    return NextResponse.redirect(
      `${reviewPath}?teams=error&message=${encodeURIComponent(result.error)}`,
    );
  }

  return NextResponse.redirect(
    `${reviewPath}?teams=connected&account=${encodeURIComponent(result.accountEmail ?? "")}`,
  );
}
