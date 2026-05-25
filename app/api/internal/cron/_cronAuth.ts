import { NextRequest } from "next/server";

/**
 * Shared cron auth guard.
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
