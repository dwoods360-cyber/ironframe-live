import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { salesteamProspectsQuerySchema } from "@/app/lib/ingress/salesteamIngressSchema";
import { listSalesteamProspectQueue } from "@/app/lib/server/salesteamIngressCore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function authorizeSalesteamIngress(request: NextRequest): NextResponse | null {
  const secret = process.env.SALESTEAM_INGRESS_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "SALESTEAM_INGRESS_UNCONFIGURED" }, { status: 503 });
  }
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED_PERIMETER_VIOLATION" }, { status: 401 });
  }
  return null;
}

/**
 * GET /api/v1/ingress/salesteam/prospects?tenantSlug=medshield&limit=50
 * Read-only poll queue for SalesTeam worker — PROSPECT-stage deals.
 */
export async function GET(request: NextRequest) {
  const denied = authorizeSalesteamIngress(request);
  if (denied) return denied;

  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const query = salesteamProspectsQuerySchema.parse(params);
    const result = await listSalesteamProspectQueue(query.tenantSlug, query.limit);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "INVALID_QUERY", issues: err.issues }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "INTERNAL_POLL_FAULT";
    if (message.startsWith("TARGET_TENANT_NOT_FOUND")) {
      return NextResponse.json({ error: "TARGET_TENANT_NOT_FOUND" }, { status: 404 });
    }
    console.error("SALESTEAM_PROSPECTS_POLL_CRASH:", err);
    return NextResponse.json({ error: "INTERNAL_POLL_FAULT" }, { status: 500 });
  }
}
