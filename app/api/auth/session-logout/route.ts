import { type NextRequest } from "next/server";

import { buildSessionLogoutResponse } from "@/app/lib/auth/sessionLogoutCore";

export const dynamic = "force-dynamic";

/** Hard logout — clears Supabase + workspace cookies, then redirects (GET) or returns JSON (POST). */
export async function GET(request: NextRequest) {
  return buildSessionLogoutResponse(request, "redirect");
}

export async function POST(request: NextRequest) {
  return buildSessionLogoutResponse(request, "json");
}
