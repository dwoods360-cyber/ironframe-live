import { NextResponse } from "next/server";

import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import { recordLegalConsent } from "@/app/lib/legal/consent";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getSupabaseSessionUser();
  if (!user?.id?.trim()) {
    return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
  }

  try {
    const { acceptanceHash } = await recordLegalConsent(user.id.trim());
    return NextResponse.json({ ok: true, acceptanceHash });
  } catch (e) {
    console.error("[api/legal/accept]", e);
    return NextResponse.json({ ok: false, error: "Failed to record consent." }, { status: 500 });
  }
}
