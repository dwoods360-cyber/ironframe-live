import { NextRequest, NextResponse } from "next/server";
import { recordIronguardViolation } from "@/app/lib/security/recordIronguardViolation";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret =
    process.env.IRONFRAME_INTERNAL_GATES_SECRET?.trim() ||
    process.env.IRONFRAME_CRON_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get("x-ironframe-internal-gates") === secret;
}

/**
 * Internal ingest for Ironguard violations (Edge middleware cannot use Prisma directly).
 */
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const errorCode = typeof body.errorCode === "string" ? body.errorCode : "UNKNOWN";
  const sessionTenantUuid = typeof body.sessionTenantUuid === "string" ? body.sessionTenantUuid : null;
  const attemptedTenantUuid = typeof body.attemptedTenantUuid === "string" ? body.attemptedTenantUuid : null;
  const path = typeof body.path === "string" ? body.path : null;
  const metadata = body.metadata && typeof body.metadata === "object" ? (body.metadata as Record<string, unknown>) : null;
  try {
    await recordIronguardViolation({
      sessionTenantUuid,
      attemptedTenantUuid,
      errorCode,
      path,
      metadata,
    });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
