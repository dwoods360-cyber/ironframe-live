import "server-only";

import { auditLogCreateLooseTx } from "@/lib/auditLogLoose";
import { withIronguardTenant } from "@/app/lib/server/ironguardSessionTenant";
import { getPrismaPrivileged } from "@/lib/prismaPrivileged";
import { logStructuredEvent } from "@/lib/structuredServerLog";

const FREEZE_AUDIT_ACTION = "AUTONOMOUS_STATE_FREEZE_TRIGGERED";

async function appendGlobalFreezeAuditForEveryTenant(input: {
  action: string;
  justification: string;
  operatorId: string;
}): Promise<void> {
  const tenants = await getPrismaPrivileged().tenant.findMany({
    select: { id: true },
    orderBy: { id: "asc" },
  });
  if (!tenants.length) {
    throw new Error("No tenant rows available for global freeze audit fan-out.");
  }

  for (const tenant of tenants) {
    await withIronguardTenant(tenant.id, (tx) =>
      auditLogCreateLooseTx(tx, {
        data: {
          action: input.action,
          justification: input.justification,
          operatorId: input.operatorId,
          threatId: null,
          isSimulation: false,
          governance_tenant_uuid: tenant.id,
        },
      }),
    );
  }
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
  return getPrismaPrivileged().ironguardViolation.count({
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
    const privileged = getPrismaPrivileged();
    const cfg = await privileged.systemConfig.findUnique({
      where: { id: "global" },
      select: { stateFreezeActive: true, sustainabilityLiveApiDegraded: true },
    });
    const already = cfg?.stateFreezeActive === true;
    if (already) {
      return { ok: true, alreadyActive: true };
    }

    await privileged.systemConfig.update({
      where: { id: "global" },
      data: { stateFreezeActive: true },
    });

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

    await appendGlobalFreezeAuditForEveryTenant({
      action: FREEZE_AUDIT_ACTION,
      justification: `[${FREEZE_AUDIT_ACTION}] ${bundle.triggeredAtIso} | reason=${reason.slice(0, 500)} | violations_1h=${violations}`,
      operatorId: "IRONLOCK_AGENT_6",
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
  const row = await getPrismaPrivileged().systemConfig.findUnique({
    where: { id: "global" },
    select: { stateFreezeActive: true },
  });
  return row?.stateFreezeActive === true;
}

/** Ops / recovery: clear autonomous global freeze (does not clear sustainability stale-data flags). */
export async function clearGlobalSecurityStateFreeze(operatorId: string): Promise<void> {
  await getPrismaPrivileged().systemConfig.update({
    where: { id: "global" },
    data: { stateFreezeActive: false },
  });
  await appendGlobalFreezeAuditForEveryTenant({
    action: "GLOBAL_STATE_FREEZE_CLEARED",
    justification: `Cleared by ${operatorId}`,
    operatorId,
  });
}
