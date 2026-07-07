import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { supportTeamTicketsQuerySchema } from "@/app/lib/ingress/supportTeamIngressSchema";
import { listSupportTeamIntakeQueue } from "@/app/lib/server/supportTeamIngressCore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function authorizeSupportTeamIngress(request: NextRequest): NextResponse | null {
  const secret = process.env.SUPPORT_TEAM_INGRESS_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "SUPPORT_TEAM_INGRESS_UNCONFIGURED" }, { status: 503 });
  }
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED_PERIMETER_VIOLATION" }, { status: 401 });
  }
  return null;
}

/**
 * GET /api/v1/ingress/support-team/tickets?tenantSlug=medshield&limit=50
 * Read-only poll queue for SupportTeam worker — pending support intake interactions.
 */
export async function GET(request: NextRequest) {
  const denied = authorizeSupportTeamIngress(request);
  if (denied) return denied;

  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const query = supportTeamTicketsQuerySchema.parse(params);
    const result = await listSupportTeamIntakeQueue(query.tenantSlug, query.limit);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "INVALID_QUERY", issues: err.issues }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "INTERNAL_POLL_FAULT";
    if (message.startsWith("TARGET_TENANT_NOT_FOUND")) {
      return NextResponse.json({ error: "TARGET_TENANT_NOT_FOUND" }, { status: 404 });
    }
    console.error("SUPPORT_TEAM_TICKETS_POLL_CRASH:", err);
    return NextResponse.json({ error: "INTERNAL_POLL_FAULT" }, { status: 500 });
  }
}
