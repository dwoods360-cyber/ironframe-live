import { NextResponse } from "next/server";
import { runHealthPostureTriage } from "@/src/services/irontech/healthPostureMonitor";

/**
 * TAS §4.3 — Live heartbeat & self-healing router (Epic 13).
 * Invoked by infrastructure timers, Ironwatch monitors, or internal agent POST hooks.
 *
 * Auth: `Authorization: Bearer ${IRONFRAME_CRON_SECRET}` or `x-cron-secret`.
 *
 * Body: `{ tenantId, threadId, currentHealthBarPercent, targetZone? }`
 */
export async function POST(req: Request) {
  const secret = process.env.IRONFRAME_CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "IRONFRAME_CRON_SECRET is not configured." },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization")?.trim();
  const headerSecret = req.headers.get("x-cron-secret")?.trim();
  const bearer = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : null;
  if (bearer !== secret && headerSecret !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const tenantId = typeof body.tenantId === "string" ? body.tenantId.trim() : "";
    const threadId = typeof body.threadId === "string" ? body.threadId.trim() : "";
    const healthRaw = body.currentHealthBarPercent ?? body.healthBarPercent;
    const targetZone =
      typeof body.targetZone === "string"
        ? body.targetZone
        : typeof body.incidentZone === "string"
          ? body.incidentZone
          : undefined;

    if (!tenantId || !threadId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_HEALTH_METRIC_BOUNDS" },
        { status: 400 },
      );
    }

    const result = await runHealthPostureTriage({
      tenantId,
      threadId,
      healthBarPercent: Number(healthRaw),
      incidentZone: targetZone,
    });

    return NextResponse.json(
      {
        success: true,
        outcome: result.outcome,
        triageEngaged: result.triageEngaged,
        auditIntelligenceLogged: result.auditIntelligenceLogged,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isBounds = message.includes("MISSING_HEALTH_METRIC_BOUNDS");
    return NextResponse.json(
      {
        success: false,
        error: isBounds ? "MISSING_HEALTH_METRIC_BOUNDS" : "INTERNAL_HEALTH_MONITOR_CRASH",
        details: message,
      },
      { status: isBounds ? 400 : 500 },
    );
  }
}
