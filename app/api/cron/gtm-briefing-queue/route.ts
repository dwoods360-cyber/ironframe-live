import { NextResponse } from "next/server";

import {
  checkCronBearerAuth,
  cronBearerUnauthorizedResponse,
} from "@/app/api/internal/cron/cronAuth";
import { runAutonomousGtmBriefingQueue } from "@/app/lib/server/autonomousGtmBriefingQueueCore";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Autonomous GTM briefing + Ironcast newsletter authorship → docs/briefing-queue/ only.
 * Never promotes or syndicates. Operator reviews in Ops Hub (promote = approve, deny = discard).
 *
 * Schedule: Vercel `0 4 * * 1-5` UTC · Windows Task `\Ironframe GTM Briefing Queue` 04:00 local.
 * Auth: Authorization: Bearer ${IRONFRAME_CRON_SECRET}
 * Disable: GTM_BRIEFING_QUEUE_CRON_ENABLED=false
 */
async function handleAutonomousQueue(request: Request) {
  if (!checkCronBearerAuth(request)) {
    return cronBearerUnauthorizedResponse();
  }

  const startedAt = new Date().toISOString();
  console.info(
    "[CRON_ACTIVATION_TRACE] Autonomous GTM briefing-queue authorship initiated.",
    JSON.stringify({ startedAt, schedule: "0 4 * * 1-5" }),
  );

  try {
    const result = await runAutonomousGtmBriefingQueue();
    console.info(
      "[CRON_HEALTH_TELEMETRY] gtm-briefing-queue completed",
      JSON.stringify({ startedAt, ...result }),
    );
    return NextResponse.json({ ...result, ok: true, startedAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Autonomous GTM queue failed.";
    console.error(
      "[CRON_HEALTH_TELEMETRY] gtm-briefing-queue failed",
      JSON.stringify({ startedAt, error: message }),
    );
    return NextResponse.json({ ok: false, error: message, startedAt }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleAutonomousQueue(request);
}

export async function POST(request: Request) {
  return handleAutonomousQueue(request);
}
