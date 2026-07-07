import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { salesteamOutreachSchema } from "@/app/lib/ingress/salesteamIngressSchema";
import { submitSalesteamOutreachDraft } from "@/app/lib/server/salesteamIngressCore";

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
 * POST /api/v1/ingress/salesteam/outreach
 * Queue email/SMS draft for mandatory operator approval.
 */
export async function POST(request: NextRequest) {
  const denied = authorizeSalesteamIngress(request);
  if (denied) return denied;

  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "INVALID_JSON_BODY" }, { status: 400 });
    }

    const parsed = salesteamOutreachSchema.parse(rawBody);
    const result = await submitSalesteamOutreachDraft(parsed);
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "INVALID_OUTREACH_GEOMETRY", issues: err.issues }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "INTERNAL_OUTREACH_FAULT";
    if (message.startsWith("TARGET_TENANT_NOT_FOUND")) {
      return NextResponse.json({ error: "TARGET_TENANT_NOT_FOUND" }, { status: 404 });
    }
    if (message.startsWith("PROSPECT_DEAL_NOT_FOUND") || message.startsWith("CONTACT_NOT_FOUND")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error("SALESTEAM_OUTREACH_INGRESS_CRASH:", err);
    return NextResponse.json({ error: "INTERNAL_OUTREACH_FAULT" }, { status: 500 });
  }
}
