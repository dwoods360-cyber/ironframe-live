import { NextRequest, NextResponse } from "next/server";
import { executeGridcoreRatePoll } from "@/src/services/ironbloom/gridcoreRatePoll";
import { runGridcoreUtilityRatePoll } from "@/app/services/ironbloom/rateEngine";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";

function resolveCronSecret(): string | undefined {
  return (
    process.env.IRONFRAME_CRON_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    undefined
  );
}

function isCronAuthorized(req: NextRequest, secret: string | undefined): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  if (!secret) return false;
  const auth = req.headers.get("authorization")?.trim();
  const headerSecret = req.headers.get("x-cron-secret")?.trim();
  const bearer = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : null;
  return bearer === secret || headerSecret === secret;
}

/**
 * Host-level trigger for Ironbloom regional telemetry (Epic 9.3 carbon ledger) and optional
 * utility rate poll (`?utility=1`, 30-day cadence; `?force=1` bypasses interval).
 * Auth: `Authorization: Bearer ${IRONFRAME_CRON_SECRET}` or `CRON_SECRET`; `x-cron-secret` also accepted.
 */
export async function POST(req: NextRequest) {
  const secret = resolveCronSecret();
  if (process.env.NODE_ENV === "production" && !secret) {
    return NextResponse.json(
      { success: false, error: "IRONFRAME_CRON_SECRET or CRON_SECRET is not configured." },
      { status: 503 },
    );
  }
  if (!isCronAuthorized(req, secret)) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED_CRON_CONTEXT" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "1";
    const runUtility = url.searchParams.get("utility") === "1";

    const outcome = await executeGridcoreRatePoll();

    await auditLogCreateLoose({
      data: {
        action: "SUSTAINABILITY_GRIDCORE_POLL_EXECUTED",
        operatorId: "CRON_ORCHESTRATOR_AGENT_18",
        tenantId: TENANT_UUIDS.gridcore,
        governance_tenant_uuid: TENANT_UUIDS.gridcore,
        justification: `Automated physical metric ledger update successful. Ingested ${outcome.recordsIngested} regional zones. Status: ${outcome.status}.`,
        isSimulation: false,
      },
    });

    const utility = runUtility ? await runGridcoreUtilityRatePoll({ force }) : undefined;

    return NextResponse.json(
      { success: true, outcome, ...(utility ? { utility } : {}) },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        error: "SUSTAINABILITY_LEDGER_CRASH",
        details: message,
      },
      { status: 500 },
    );
  }
}
