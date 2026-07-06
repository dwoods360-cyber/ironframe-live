import "server-only";

import { NextResponse } from "next/server";

import { getSupabaseSessionUser } from "@/app/utils/serverAuth";

/** Reject anonymous callers on product documentation API routes (defense in depth with middleware). */
export async function requireSessionForDocumentationApi(): Promise<NextResponse | null> {
  const user = await getSupabaseSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
  }
  return null;
}
