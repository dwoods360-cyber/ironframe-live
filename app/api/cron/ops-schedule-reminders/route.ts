import { NextResponse } from "next/server";

import {
  checkCronBearerAuth,
  cronBearerUnauthorizedResponse,
} from "@/app/api/internal/cron/cronAuth";
import { runOpsScheduleReminders } from "@/app/lib/server/opsScheduleCore";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Daily Ops Schedule reminders (T-3 / T-2 / T-1 / T-0).
 *
 * Schedule: Vercel `15 13 * * *` UTC (~08:15 US Central in summer) · Windows Task 08:15 local.
 * Auth: Authorization: Bearer ${IRONFRAME_CRON_SECRET}
 * Disable: OPS_SCHEDULE_REMINDERS_CRON_ENABLED=false
 *
 * Delivery: enabled NotificationEndpoint webhooks + optional OPS_SCHEDULE_NOTIFY_EMAIL (Resend).
 */
async function handleReminders(request: Request) {
  if (!checkCronBearerAuth(request)) {
    return cronBearerUnauthorizedResponse();
  }

  if (process.env.OPS_SCHEDULE_REMINDERS_CRON_ENABLED === "false") {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "OPS_SCHEDULE_REMINDERS_CRON_ENABLED=false",
    });
  }

  const startedAt = new Date().toISOString();
  console.info(
    "[CRON_ACTIVATION_TRACE] Ops schedule reminders initiated.",
    JSON.stringify({ startedAt }),
  );

  try {
    const result = await runOpsScheduleReminders();
    console.info(
      "[CRON_HEALTH_TELEMETRY] ops-schedule-reminders completed",
      JSON.stringify({ startedAt, sent: result.sent.length, scanned: result.scanned }),
    );
    return NextResponse.json({ ...result, startedAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ops schedule reminders failed.";
    console.error(
      "[CRON_HEALTH_TELEMETRY] ops-schedule-reminders failed",
      JSON.stringify({ startedAt, error: message }),
    );
    return NextResponse.json({ ok: false, error: message, startedAt }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleReminders(request);
}

export async function POST(request: Request) {
  return handleReminders(request);
}
