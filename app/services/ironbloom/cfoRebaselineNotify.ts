import "server-only";

import { createHash } from "crypto";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import type { PhysicalUnitType } from "@/app/types/ironbloomGridcore";

export type CfoEsgRebaselineNotification = {
  id: string;
  sentAt: string;
  tenantKey: string;
  recipientRole: "CFO";
  pulseMessage: string;
  driftRatio: number;
};

/**
 * >15% utility rate drift — CFO must re-baseline sustainability cost models.
 */
export async function notifyCfoEsgRebaseline(params: {
  tenantKey: string;
  priorRateUsd: number;
  newRateUsd: number;
  driftRatio: number;
  unitType: PhysicalUnitType;
  jurisdiction: string;
}): Promise<CfoEsgRebaselineNotification> {
  const pct = (params.driftRatio * 100).toFixed(1);
  const notification: CfoEsgRebaselineNotification = {
    id: createHash("sha256")
      .update(`esg-rebaseline:${params.tenantKey}:${Date.now()}`, "utf8")
      .digest("hex")
      .slice(0, 12),
    sentAt: new Date().toISOString(),
    tenantKey: params.tenantKey,
    recipientRole: "CFO",
    driftRatio: params.driftRatio,
    pulseMessage: `[ESG_RE-BASELINE_ALERT] Utility ${params.unitType} rate for ${params.jurisdiction} shifted ${pct}% (${params.priorRateUsd.toFixed(4)} → ${params.newRateUsd.toFixed(4)} USD/unit). Re-baseline sustainability cost models before next CSRD filing.`,
  };

  try {
    await auditLogCreateLoose({
      data: {
        action: "ESG_RE_BASELINE_ALERT",
        justification: JSON.stringify({
          notification,
          priorRateUsd: params.priorRateUsd,
          newRateUsd: params.newRateUsd,
          unitType: params.unitType,
          jurisdiction: params.jurisdiction,
          recipientEnv: process.env.GRC_EMAIL_EXECUTIVE ?? "CFO",
        }),
        operatorId: "IRONBLOOM_AGENT_18",
        threatId: null,
        isSimulation: false,
      },
    });
  } catch {
    /* best-effort */
  }

  return notification;
}
