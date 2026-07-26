import { NextResponse } from "next/server";

import {
  checkCronBearerAuth,
  cronBearerUnauthorizedResponse,
} from "@/app/api/internal/cron/cronAuth";
import { processInboundLeadSlaBackupTick } from "@/app/lib/server/inboundLeadSlaBackup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Inbound design-partner SLA backup — T2 ops escalate / T3 prospect hold.
 * Schedule: every 15 minutes. Auth: Authorization: Bearer ${IRONFRAME_CRON_SECRET}.
 * Business clock: America/Chicago Mon–Fri 09:00–17:00 (no weekends / US federal holidays).
 */
async function handleCron(request: Request) {
  if (!checkCronBearerAuth(request)) {
    return cronBearerUnauthorizedResponse();
  }

  try {
    const result = await processInboundLeadSlaBackupTick();
    console.info("[inbound-sla-cron]", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[inbound-sla-cron]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
