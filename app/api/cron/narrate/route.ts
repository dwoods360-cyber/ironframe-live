import { NextResponse } from "next/server";

import {
  checkCronBearerAuth,
  cronBearerUnauthorizedResponse,
} from "@/app/api/internal/cron/cronAuth";
import { runNightlyGovernanceNarrate } from "@/app/lib/reports/narrateGovernanceTriad";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Nightly 03:00 boardroom narrative hydration.
 * Auth: Authorization: Bearer ${IRONFRAME_CRON_SECRET}
 */
async function handleNarrate(request: Request) {
  if (!checkCronBearerAuth(request)) {
    return cronBearerUnauthorizedResponse();
  }

  console.info("[CRON_ACTIVATION_TRACE] Governance Frame narrate execution initiated.");

  const url = new URL(request.url);
  const tenantId =
    request.headers.get("x-tenant-id")?.trim() ||
    url.searchParams.get("tenantId")?.trim() ||
    process.env.SHADOW_PLANE_INGEST_TENANT_UUID?.trim() ||
    TENANT_UUIDS.medshield;

  try {
    const result = await runNightlyGovernanceNarrate(tenantId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Narrate cron failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleNarrate(request);
}

export async function POST(request: Request) {
  return handleNarrate(request);
}
