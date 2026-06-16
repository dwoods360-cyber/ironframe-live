import { NextRequest, NextResponse } from "next/server";
import { isPlatformAdministratorIdentity } from "@/app/lib/auth/platformAdminAccess";

export const dynamic = "force-dynamic";

function gatesAuthorized(req: NextRequest): boolean {
  const secret =
    process.env.IRONFRAME_INTERNAL_GATES_SECRET?.trim() ||
    process.env.IRONFRAME_CRON_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get("x-ironframe-internal-gates") === secret;
}

/** Edge-safe GLOBAL_ADMIN check for middleware (admin onboarding routes). */
export async function GET(req: NextRequest) {
  if (!gatesAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.nextUrl.searchParams.get("userId")?.trim() ?? "";
  const email = req.nextUrl.searchParams.get("email")?.trim() || null;

  if (!userId) {
    return NextResponse.json({ ok: true, allowed: false }, { headers: { "Cache-Control": "no-store" } });
  }

  const allowed = await isPlatformAdministratorIdentity(userId, email);
  return NextResponse.json({ ok: true, allowed }, { headers: { "Cache-Control": "no-store" } });
}
