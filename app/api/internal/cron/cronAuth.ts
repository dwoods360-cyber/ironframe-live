import { NextRequest, NextResponse } from "next/server";

const BEARER_PREFIX = "Bearer ";

/** Fail-closed 401 for cron routes gated on Bearer IRONFRAME_CRON_SECRET. */
export function cronBearerUnauthorizedResponse(): NextResponse {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

/**
 * Vercel Cron perimeter — accepts:
 * - Authorization: Bearer <IRONFRAME_CRON_SECRET> (manual / legacy ops)
 * - Authorization: Bearer <CRON_SECRET> (Vercel Cron auto-header when CRON_SECRET is set)
 * - x-vercel-cron-auth-token (platform cron; validated by Vercel edge before app)
 *
 * Rejects missing/malformed Bearer when neither platform cron token nor secrets match.
 */
export function checkCronBearerAuth(request: Request): boolean {
  // Vercel Cron platform token — present only on infrastructure-invoked cron GETs.
  if (request.headers.get("x-vercel-cron-auth-token")?.trim()) {
    return true;
  }

  const secret =
    process.env.IRONFRAME_CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith(BEARER_PREFIX)) return false;

  const token = authHeader.slice(BEARER_PREFIX.length).trim();
  if (!token) return false;

  const cronSecret = process.env.CRON_SECRET?.trim();
  const ironSecret = process.env.IRONFRAME_CRON_SECRET?.trim();
  return token === ironSecret || token === cronSecret || token === secret;
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

/**
 * Board syndication feed — query `?secret=` (Substack/RSS) or Bearer / x-cron-secret.
 */
export function checkBoardFeedAuth(request: Request): boolean {
  const secret = process.env.IRONFRAME_CRON_SECRET?.trim();
  if (!secret) return false;

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret")?.trim();
  if (querySecret && querySecret === secret) return true;

  return checkCronAuth(request as NextRequest);
}
