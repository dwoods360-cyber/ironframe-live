import "server-only";

import { createHash } from "crypto";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import type { CisoDriftNotification } from "@/app/types/regulatoryIngestion";
import type { RegulatoryDriftAlert } from "@/app/types/complianceDrift";

export async function notifyCisoCriticalDrift(params: {
  alert: RegulatoryDriftAlert;
  regulationId: string;
  amendmentPreview: string | null;
}): Promise<CisoDriftNotification> {
  const notification: CisoDriftNotification = {
    id: createHash("sha256")
      .update(`ciso:${params.alert.id}:${Date.now()}`, "utf8")
      .digest("hex")
      .slice(0, 12),
    sentAt: new Date().toISOString(),
    alertId: params.alert.id,
    regulationId: params.regulationId,
    recipientRole: "CISO",
    pulseMessage: `[CRITICAL DRIFT] ${params.alert.pulseMessage}`,
    oneClickAmendmentPath: `/admin/governance/comparison?alert=${params.alert.id}&regulation=${params.regulationId}&action=amend`,
    amendmentPreview: params.amendmentPreview,
  };

  try {
    await auditLogCreateLoose({
      data: {
        action: "CISO_CRITICAL_DRIFT_ALERT",
        justification: JSON.stringify({
          notification,
          severity: params.alert.severity,
          tasSection: params.alert.tasSection,
          oneClickPath: notification.oneClickAmendmentPath,
        }),
        operatorId: "IRONTALLY_AGENT_19",
        threatId: null,
        isSimulation: false,
      },
    });
  } catch {
    /* best-effort */
  }

  return notification;
}
