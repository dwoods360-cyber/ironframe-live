import { NextResponse } from "next/server";

import {
  checkCronBearerAuth,
  cronBearerUnauthorizedResponse,
} from "@/app/api/internal/cron/cronAuth";
import { isInboundSlaTestAccelEnabled } from "@/config/commercialGates";
import { processInboundLeadSlaBackupTick } from "@/app/lib/server/inboundLeadSlaBackup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BEARER_PREFIX = "Bearer ";

/**
 * When TEST_ACCEL is on, also accept IRONFRAME_SLA_TEST_BEARER (QA-only; remove after ladder).
 * Production Vercel Cron continues to use IRONFRAME_CRON_SECRET.
 */
function checkInboundSlaCronAuth(request: Request): boolean {
  if (checkCronBearerAuth(request)) return true;
  if (!isInboundSlaTestAccelEnabled()) return false;
  const testBearer = process.env.IRONFRAME_SLA_TEST_BEARER?.trim();
  if (!testBearer) return false;
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith(BEARER_PREFIX)) return false;
  return authHeader.slice(BEARER_PREFIX.length).trim() === testBearer;
}

/**
 * Inbound design-partner SLA backup — T2 ops escalate / T3 prospect hold.
 * Schedule: every 15 minutes. Auth: Authorization: Bearer ${IRONFRAME_CRON_SECRET}.
 * Optional QA: IRONFRAME_SLA_TEST_BEARER while IRONFRAME_INBOUND_SLA_TEST_ACCEL=1.
 */
async function handleCron(request: Request) {
  if (!checkInboundSlaCronAuth(request)) {
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
