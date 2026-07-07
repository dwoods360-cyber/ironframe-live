import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { supportTeamReplySchema } from "@/app/lib/ingress/supportTeamIngressSchema";
import { submitSupportTeamReplyDraft } from "@/app/lib/server/supportTeamIngressCore";

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
 * POST /api/v1/ingress/support-team/reply
 * Queue support reply draft for mandatory operator approval.
 */
export async function POST(request: NextRequest) {
  const denied = authorizeSupportTeamIngress(request);
  if (denied) return denied;

  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "INVALID_JSON_BODY" }, { status: 400 });
    }

    const parsed = supportTeamReplySchema.parse(rawBody);
    const result = await submitSupportTeamReplyDraft(parsed);
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "INVALID_REPLY_GEOMETRY", issues: err.issues }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "INTERNAL_REPLY_FAULT";
    if (message.startsWith("TARGET_TENANT_NOT_FOUND")) {
      return NextResponse.json({ error: "TARGET_TENANT_NOT_FOUND" }, { status: 404 });
    }
    if (
      message.startsWith("SUPPORT_INTAKE_NOT_FOUND") ||
      message.startsWith("CONTACT_NOT_FOUND")
    ) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error("SUPPORT_TEAM_REPLY_INGRESS_CRASH:", err);
    return NextResponse.json({ error: "INTERNAL_REPLY_FAULT" }, { status: 500 });
  }
}
