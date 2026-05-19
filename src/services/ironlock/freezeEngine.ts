import "server-only";

import prisma from "@/lib/prisma";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import { logStructuredEvent } from "@/lib/structuredServerLog";

const FREEZE_AUDIT_ACTION = "AUTONOMOUS_STATE_FREEZE_TRIGGERED";

async function resolveGovernanceTenantUuidForAudit(): Promise<string> {
  const row = await prisma.tenant.findFirst({ select: { id: true }, orderBy: { id: "asc" } });
  if (!row?.id) throw new Error("No tenant row for AuditLog governance partition.");
  return row.id;
}

export type IronlockFreezeDiagnosticBundle = {
  kind: "IRONLOCK_GLOBAL_STATE_FREEZE";
  triggeredAtIso: string;
  reason: string;
  systemConfig: {
    stateFreezeActive: boolean;
    sustainabilityLiveApiDegraded: boolean;
  };
  ironguardViolationsLastHour: number;
};

async function countIronguardViolationsSince(since: Date): Promise<number> {
  return prisma.ironguardViolation.count({
    where: { createdAt: { gte: since } },
  });
}

async function sendDevDiagnosticWebhook(bundle: IronlockFreezeDiagnosticBundle): Promise<void> {
  const url = process.env.IRONFRAME_DEV_DIAGNOSTIC_WEBHOOK_URL?.trim();
  if (!url) {
    logStructuredEvent("Ironcast", "dev_freeze_webhook_skipped", { reason: "IRONFRAME_DEV_DIAGNOSTIC_WEBHOOK_URL unset" }, "warn");
    return;
  }
  const secret = process.env.IRONFRAME_DEV_DIAGNOSTIC_WEBHOOK_SECRET?.trim();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-ironframe-webhook-secret": secret } : {}),
      },
      body: JSON.stringify(bundle),
    });
    if (!res.ok) {
      logStructuredEvent(
        "Ironcast",
        "dev_freeze_webhook_failed",
        { httpStatus: res.status, statusText: res.statusText },
        "warn",
      );
    } else {
      logStructuredEvent("Ironcast", "dev_freeze_webhook_ok", { httpStatus: res.status }, "info");
    }
  } catch (e) {
    logStructuredEvent("Ironcast", "dev_freeze_webhook_error", { message: e instanceof Error ? e.message : String(e) }, "error");
  }
}

/**
 * Ironlock (Agent 6): autonomous global mutation freeze — sets `SystemConfig.state_freeze_active`,
 * appends AuditLog, and notifies Ironcast dev webhook with a diagnostic bundle.
 */
export async function initiateStateFreeze(reason: string): Promise<{ ok: true; alreadyActive?: boolean } | { ok: false; error: string }> {
  try {
    const cfg = await prisma.systemConfig.findUnique({
      where: { id: "global" },
      select: { stateFreezeActive: true, sustainabilityLiveApiDegraded: true },
    });
    const already = cfg?.stateFreezeActive === true;
    if (already) {
      return { ok: true, alreadyActive: true };
    }

    await prisma.systemConfig.update({
      where: { id: "global" },
      data: { stateFreezeActive: true },
    });

    const governance = await resolveGovernanceTenantUuidForAudit();
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const violations = await countIronguardViolationsSince(since);
    const bundle: IronlockFreezeDiagnosticBundle = {
      kind: "IRONLOCK_GLOBAL_STATE_FREEZE",
      triggeredAtIso: new Date().toISOString(),
      reason: reason.slice(0, 2000),
      systemConfig: {
        stateFreezeActive: true,
        sustainabilityLiveApiDegraded: cfg?.sustainabilityLiveApiDegraded === true,
      },
      ironguardViolationsLastHour: violations,
    };

    await auditLogCreateLoose({
      data: {
        action: FREEZE_AUDIT_ACTION,
        justification: `[${FREEZE_AUDIT_ACTION}] ${bundle.triggeredAtIso} | reason=${reason.slice(0, 500)} | violations_1h=${violations}`,
        operatorId: "IRONLOCK_AGENT_6",
        threatId: null,
        isSimulation: false,
        governance_tenant_uuid: governance,
      },
    });

    await sendDevDiagnosticWebhook(bundle);

    return { ok: true, alreadyActive: false };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/** Read-only: global security freeze flag (distinct from Irontech sustainability stale lockdown). */
export async function getGlobalSecurityStateFreezeActive(): Promise<boolean> {
  const row = await prisma.systemConfig.findUnique({
    where: { id: "global" },
    select: { stateFreezeActive: true },
  });
  return row?.stateFreezeActive === true;
}

/** Ops / recovery: clear autonomous global freeze (does not clear sustainability stale-data flags). */
export async function clearGlobalSecurityStateFreeze(operatorId: string): Promise<void> {
  await prisma.systemConfig.update({
    where: { id: "global" },
    data: { stateFreezeActive: false },
  });
  const governance = await resolveGovernanceTenantUuidForAudit();
  await auditLogCreateLoose({
    data: {
      action: "GLOBAL_STATE_FREEZE_CLEARED",
      justification: `Cleared by ${operatorId}`,
      operatorId,
      threatId: null,
      isSimulation: false,
      governance_tenant_uuid: governance,
    },
  });
}
