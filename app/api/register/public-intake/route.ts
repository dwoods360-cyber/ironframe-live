import { NextRequest, NextResponse } from "next/server";
import { isPublicRegistrationEnabled } from "@/config/registration";

export const dynamic = "force-dynamic";

/** Legacy public intake — permanently disabled when invite-only registration is active. */
export async function POST(_req: NextRequest) {
  if (!isPublicRegistrationEnabled()) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  return NextResponse.json(
    { ok: false, error: "Public registration is not enabled on this deployment." },
    { status: 403 },
  );
}
