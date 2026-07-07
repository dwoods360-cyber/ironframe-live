import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { supportTeamContextSnapshotQuerySchema } from "@/app/lib/ingress/supportTeamIngressSchema";
import { getSupportTeamContextSnapshot } from "@/app/lib/server/supportTeamIngressCore";

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
 * GET /api/v1/ingress/support-team/context-snapshot?tenantSlug=medshield
 * Tenant-scoped forensic snapshot for SupportTeam enrichment.
 */
export async function GET(request: NextRequest) {
  const denied = authorizeSupportTeamIngress(request);
  if (denied) return denied;

  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const query = supportTeamContextSnapshotQuerySchema.parse(params);
    const snapshot = await getSupportTeamContextSnapshot(query.tenantSlug);
    return NextResponse.json(snapshot);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "INVALID_QUERY", issues: err.issues }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "INTERNAL_SNAPSHOT_FAULT";
    if (message.startsWith("TARGET_TENANT_NOT_FOUND")) {
      return NextResponse.json({ error: "TARGET_TENANT_NOT_FOUND" }, { status: 404 });
    }
    console.error("SUPPORT_TEAM_CONTEXT_SNAPSHOT_CRASH:", err);
    return NextResponse.json({ error: "INTERNAL_SNAPSHOT_FAULT" }, { status: 500 });
  }
}
