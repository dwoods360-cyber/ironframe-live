import { NextRequest, NextResponse } from "next/server";
import { evaluateQuarantineLedger } from "@/app/lib/security/quarantineLedgerGuard";

export const dynamic = "force-dynamic";

function gatesAuthorized(req: NextRequest): boolean {
  const secret =
    process.env.IRONFRAME_INTERNAL_GATES_SECRET?.trim() ||
    process.env.IRONFRAME_CRON_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get("x-ironframe-internal-gates") === secret;
}

/** Edge-safe quarantine check for middleware (IP + optional authenticated user id). */
export async function GET(req: NextRequest) {
  if (!gatesAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const ip = req.nextUrl.searchParams.get("ip")?.trim() || undefined;
  const userId = req.nextUrl.searchParams.get("userId")?.trim() || undefined;
  const r = await evaluateQuarantineLedger({ clientIp: ip, userId });
  if (!r.ok) {
    return NextResponse.json(
      { ok: true, blocked: true, code: r.code, error: r.error },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json({ ok: true, blocked: false }, { headers: { "Cache-Control": "no-store" } });
}
