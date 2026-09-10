import { NextRequest, NextResponse } from "next/server";

import { consumeFellowAccessVerification } from "@/app/lib/fellows/accessVerification";
import { mintFellowSessionToken } from "@/app/lib/fellows/session";
import { FELLOWS_SESSION_COOKIE } from "@/config/fellowsPortal";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const consumed = await consumeFellowAccessVerification(req.nextUrl.searchParams.get("token"));
  if (!consumed) {
    return NextResponse.redirect(new URL("/fellows?verification=invalid", req.nextUrl.origin));
  }

  const response = NextResponse.redirect(new URL("/fellows/lab", req.nextUrl.origin));
  response.cookies.set(FELLOWS_SESSION_COOKIE, mintFellowSessionToken(consumed.fellowId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
