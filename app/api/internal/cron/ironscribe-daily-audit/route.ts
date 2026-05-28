import { NextRequest, NextResponse } from "next/server";
import { runIronscribeDailyAuditSynthesis } from "@/src/services/ironscribe/auditSynthesizer";
import { checkCronAuth } from "@/app/api/internal/cron/cronAuth";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import prisma from "@/lib/prisma";

/**
 * Ironscribe — daily 24h audit synthesis to \`storage/forensics/audits/DAILY_AUDIT_REPORT_<timestamp>.md\`.
 * Auth: \`Authorization: Bearer ${IRONFRAME_CRON_SECRET}\` or \`x-cron-secret\`.
 */
async function handleCron(req: NextRequest) {
  if (!checkCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const tenantId =
    req.headers.get("x-tenant-id")?.trim() ||
    url.searchParams.get("tenantId")?.trim() ||
    process.env.SHADOW_PLANE_INGEST_TENANT_UUID?.trim() ||
    TENANT_UUIDS.medshield;

  try {
    const result = await runIronscribeDailyAuditSynthesis();
    const prismaAny = prisma as any;
    const artifact = await prismaAny.cronJobArtifact.create({
      data: {
        tenantId,
        agentName: "ironscribe-daily-audit",
        payloadJson: {
          result,
          degraded: false,
          source: "cron-ironscribe-daily-audit",
        },
      },
      select: { id: true },
    });

    return NextResponse.json({
      ...result,
      degraded: false,
      artifactId: artifact.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      const prismaAny = prisma as any;
      await prismaAny.cronJobArtifact.create({
        data: {
          tenantId,
          agentName: "ironscribe-daily-audit",
          payloadJson: {
            degraded: true,
            error: "IRONSCRIBE_DAILY_AUDIT_CRASH",
            details: message,
            source: "cron-ironscribe-daily-audit",
          },
        },
      });
    } catch {
      // Best-effort only.
    }

    return NextResponse.json(
      {
        ok: true,
        degraded: true,
        error: "IRONSCRIBE_DAILY_AUDIT_CRASH",
        details: message,
      },
      { status: 200 },
    );
  }
}

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}
