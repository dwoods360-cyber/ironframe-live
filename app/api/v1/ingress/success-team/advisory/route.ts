import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { successTeamAdvisorySchema } from "@/app/lib/ingress/successTeamIngressSchema";
import { submitSuccessTeamAdvisory } from "@/app/lib/server/successTeamIngressCore";

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
 * POST /api/v1/ingress/success-team/advisory
 * Queue CS advisory draft for mandatory human approval — never auto-sends.
 */
export async function POST(request: NextRequest) {
  const denied = authorizeSuccessTeamIngress(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const payload = successTeamAdvisorySchema.parse(body);
    const result = await submitSuccessTeamAdvisory(payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "INVALID_PAYLOAD", issues: err.issues }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "INTERNAL_ADVISORY_FAULT";
    if (message.startsWith("TARGET_TENANT_NOT_FOUND")) {
      return NextResponse.json({ error: "TARGET_TENANT_NOT_FOUND" }, { status: 404 });
    }
    if (message.startsWith("CLOSED_WON_DEAL_NOT_FOUND") || message.startsWith("CONTACT_NOT_FOUND")) {
      return NextResponse.json({ error: message.split(":")[0] }, { status: 404 });
    }
    console.error("SUCCESS_TEAM_ADVISORY_CRASH:", err);
    return NextResponse.json({ error: "INTERNAL_ADVISORY_FAULT" }, { status: 500 });
  }
}
