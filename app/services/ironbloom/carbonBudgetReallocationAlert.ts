import "server-only";

import { createHash, randomUUID } from "crypto";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import { resolveMonthlyCarbonBudgetThresholdCents } from "@/app/config/ironbloomCarbonBudget";
import { CFO_SUSTAINABILITY_ROI_METADATA } from "@/app/config/cfoSustainabilityMetadata";
import { aggregateMonthlyProductionMitigatedValueCents } from "@/app/lib/ironbloom/productionCarbonLedger";
import { formatCentsToAccountingUSD } from "@/app/utils/formatCentsToUSD";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import { IroncastService } from "@/services/ironcast.service";
import prisma from "@/lib/prisma";

export const CARBON_BUDGET_REALLOCATION_ALERT_NAME = "Monthly Carbon Budget Reallocation Alert";

function utcMonthKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

export type RunCarbonBudgetReallocationAlertOutcome =
  | {
      ok: true;
      skipped: true;
      reason: string;
      monthKey: string;
      mitigatedValueCents: string;
      thresholdCents: string;
    }
  | {
      ok: true;
      skipped: false;
      alerted: true;
      monthKey: string;
      mitigatedValueCents: string;
      thresholdCents: string;
      alertId: string;
      sustainabilityUnit: "kWh";
    }
  | { ok: false; error: string };

export type RunCarbonBudgetReallocationAlertOptions = {
  /** Bypass Day-1 gate (manual / test). */
  force?: boolean;
  /** ISO timestamp anchor for month window (defaults to now). */
  asOf?: Date;
};

/**
 * Monthly (Day 1): if production `mitigatedValueCents` for the current UTC month exceeds the
 * configured threshold, dispatch a CFO Budget Reallocation alert (deduped per `YYYY-MM`).
 */
export async function runCarbonBudgetReallocationAlertIfDue(
  options: RunCarbonBudgetReallocationAlertOptions = {},
): Promise<RunCarbonBudgetReallocationAlertOutcome> {
  const now = options.asOf ?? new Date();
  const monthKey = utcMonthKey(now);

  if (!options.force && now.getUTCDate() !== 1) {
    return {
      ok: true,
      skipped: true,
      reason: "Scheduled for UTC day 1 of each month (use force=1 to run early).",
      monthKey,
      mitigatedValueCents: "0",
      thresholdCents: resolveMonthlyCarbonBudgetThresholdCents().toString(),
    };
  }

  try {
    const since = startOfUtcMonth(now);
    const mitigatedValueCents = await aggregateMonthlyProductionMitigatedValueCents({ since });
    const thresholdCents = resolveMonthlyCarbonBudgetThresholdCents();

    const prismaAny = prisma as any;
    const recentDispatches = await prismaAny.cronJobArtifact.findMany({
      where: {
        tenantId: TENANT_UUIDS.medshield,
        agentName: "carbon-budget-reallocation-dispatch",
      },
      orderBy: {
        runTimestamp: "desc",
      },
      take: 24,
      select: {
        payloadJson: true,
      },
    });
    const wasAlreadyDispatched =
      !options.force &&
      recentDispatches.some((row: { payloadJson?: unknown }) => {
        const payload = row.payloadJson;
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
        return (payload as { monthKey?: unknown }).monthKey === monthKey;
      });

    if (wasAlreadyDispatched) {
      return {
        ok: true,
        skipped: true,
        reason: `Budget Reallocation alert already sent for ${monthKey}.`,
        monthKey,
        mitigatedValueCents: mitigatedValueCents.toString(),
        thresholdCents: thresholdCents.toString(),
      };
    }

    if (mitigatedValueCents <= thresholdCents) {
      return {
        ok: true,
        skipped: true,
        reason: `Monthly mitigated value ${mitigatedValueCents.toString()} cents is within threshold ${thresholdCents.toString()} cents.`,
        monthKey,
        mitigatedValueCents: mitigatedValueCents.toString(),
        thresholdCents: thresholdCents.toString(),
      };
    }

    const mitigatedDisplay = formatCentsToAccountingUSD(mitigatedValueCents);
    const thresholdDisplay = formatCentsToAccountingUSD(thresholdCents);
    const alertId = createHash("sha256")
      .update(`carbon-budget-realloc:${monthKey}:${mitigatedValueCents}`, "utf8")
      .digest("hex")
      .slice(0, 12);

    const pulseMessage =
      `[BUDGET_REALLOCATION_ALERT] ${CARBON_BUDGET_REALLOCATION_ALERT_NAME}: Ironbloom sealed mitigatedValueCents ` +
      `${mitigatedDisplay} exceeded monthly threshold ${thresholdDisplay} (${monthKey}). ` +
      `${CFO_SUSTAINABILITY_ROI_METADATA} Reallocate sustainability budget before next CSRD cycle.`;

    try {
      await auditLogCreateLoose({
        data: {
          action: "BUDGET_REALLOCATION_ALERT",
          justification: JSON.stringify({
            alertName: CARBON_BUDGET_REALLOCATION_ALERT_NAME,
            monthKey,
            mitigatedValueCents: mitigatedValueCents.toString(),
            thresholdCents: thresholdCents.toString(),
            mitigatedDisplay,
            thresholdDisplay,
            periodStart: since.toISOString(),
            periodEnd: now.toISOString(),
            metadata: CFO_SUSTAINABILITY_ROI_METADATA,
            pulseMessage,
            alertId,
          }),
          operatorId: "IRONBLOOM_AGENT_18",
          threatId: null,
          isSimulation: false,
        },
      });
    } catch {
      /* best-effort */
    }

    const notifyEmail =
      process.env.GRC_EMAIL_EXECUTIVE?.trim() ||
      process.env.ADMIN_ALERT_EMAIL?.trim() ||
      process.env.ZOHO_EMAIL_USER?.trim();
    if (notifyEmail && process.env.RESEND_API_KEY) {
      try {
        await IroncastService.dispatch({
          tenant_id: TENANT_UUIDS.medshield,
          sanitization_status: "VERIFIED_SYSTEM_GENERATED",
          irongate_trace_id: randomUUID(),
          recipient: { email: notifyEmail, role: "PRODUCT_OWNER" },
          notification: {
            priority: "HIGH",
            subject: `Ironcast · ${CARBON_BUDGET_REALLOCATION_ALERT_NAME}`,
            body_summary: pulseMessage,
          },
          timestamp: BigInt(Date.now()),
        });
      } catch (e) {
        console.warn("[carbonBudgetReallocationAlert] Ironcast notify skipped:", e);
      }
    }

    await prismaAny.cronJobArtifact.create({
      data: {
        tenantId: TENANT_UUIDS.medshield,
        agentName: "carbon-budget-reallocation-dispatch",
        payloadJson: {
          monthKey,
          alertId,
          mitigatedValueCents: mitigatedValueCents.toString(),
          thresholdCents: thresholdCents.toString(),
          sustainabilityUnit: "kWh",
        },
        metricValue: mitigatedValueCents,
        metricUnit: "kWh",
      },
    });

    return {
      ok: true,
      skipped: false,
      alerted: true,
      monthKey,
      mitigatedValueCents: mitigatedValueCents.toString(),
      thresholdCents: thresholdCents.toString(),
      alertId,
      sustainabilityUnit: "kWh",
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
