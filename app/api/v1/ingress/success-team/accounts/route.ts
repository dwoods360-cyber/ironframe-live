import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { successTeamAccountsQuerySchema } from "@/app/lib/ingress/successTeamIngressSchema";
import { listSuccessTeamAccounts } from "@/app/lib/server/successTeamIngressCore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function authorizeSuccessTeamIngress(request: NextRequest): NextResponse | null {
  const secret = process.env.SUCCESS_TEAM_INGRESS_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "SUCCESS_TEAM_INGRESS_UNCONFIGURED" }, { status: 503 });
  }
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED_PERIMETER_VIOLATION" }, { status: 401 });
  }
  return null;
}

/**
 * GET /api/v1/ingress/success-team/accounts?tenantSlug=acorp&limit=50
 * Read-only poll queue for IronSuccessTeam — CLOSED_WON accounts.
 */
export async function GET(request: NextRequest) {
  const denied = authorizeSuccessTeamIngress(request);
  if (denied) return denied;

  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const query = successTeamAccountsQuerySchema.parse(params);
    const result = await listSuccessTeamAccounts(query.tenantSlug, query.limit);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "INVALID_QUERY", issues: err.issues }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "INTERNAL_POLL_FAULT";
    if (message.startsWith("TARGET_TENANT_NOT_FOUND")) {
      return NextResponse.json({ error: "TARGET_TENANT_NOT_FOUND" }, { status: 404 });
    }
    console.error("SUCCESS_TEAM_ACCOUNTS_POLL_CRASH:", err);
    return NextResponse.json({ error: "INTERNAL_POLL_FAULT" }, { status: 500 });
  }
}
