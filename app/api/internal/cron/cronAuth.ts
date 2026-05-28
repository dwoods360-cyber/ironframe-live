import { NextRequest, NextResponse } from "next/server";

const BEARER_PREFIX = "Bearer ";

/** Fail-closed 401 for cron routes gated on Bearer IRONFRAME_CRON_SECRET. */
export function cronBearerUnauthorizedResponse(): NextResponse {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

/**
 * Vercel Cron perimeter — `Authorization: Bearer <IRONFRAME_CRON_SECRET>` only.
 * Rejects missing, malformed (`Bearer` prefix required), or mutated tokens.
 */
export function checkCronBearerAuth(request: Request): boolean {
  const secret = process.env.IRONFRAME_CRON_SECRET?.trim();
  if (!secret) return false;

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith(BEARER_PREFIX)) return false;

  const token = authHeader.slice(BEARER_PREFIX.length).trim();
  return token.length > 0 && token === secret;
}

/**
 * Shared cron auth guard (legacy dual-header + staging smoke secret).
 * Accepts either:
 * - Authorization: Bearer <IRONFRAME_CRON_SECRET>
 * - x-cron-secret: <IRONFRAME_CRON_SECRET>
 */
export function checkCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("Authorization")?.trim();
  const cronHeader = request.headers.get("x-cron-secret")?.trim();
  const localSecret = process.env.IRONFRAME_CRON_SECRET?.trim();
  const stagingSecret = process.env.STAGING_SMOKE_SECRET?.trim();

  // Non-production staging verification track.
  if (stagingSecret) {
    if (authHeader === `Bearer ${stagingSecret}`) return true;
    if (cronHeader === stagingSecret) return true;
  }

  if (!localSecret) return false;
  if (authHeader === `Bearer ${localSecret}`) return true;
  if (cronHeader === localSecret) return true;
  return false;
}
