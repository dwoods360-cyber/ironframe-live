import type { NotificationChannelType } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { RemediationImpactReport } from "@/app/types/remediationReceipt";
import { buildRemediationStakeholderBrief } from "@/app/utils/remediationStakeholderBrief";
import { decryptNotificationUrl } from "@/lib/security/notificationEndpointCrypto";
import { assertWebhookUrlPassesIrongate } from "@/lib/security/irongateOutboundWebhook";
import { SIMULATION_CONFIG_ID } from "@/app/utils/simulationConfigConstants";

function jsonBodyForChannel(_channelType: NotificationChannelType, text: string): Record<string, unknown> {
  // Slack incoming webhooks + many Teams / generic connectors accept `{ "text": "..." }`.
  return { text };
}

/**
 * Phase 1.5 stakeholder blast: POST internal brief to every enabled row in `NotificationEndpoint`
 * after Irongate re-validation on each decrypted URL.
 */
export async function sendRemediationStakeholderBroadcast(report: RemediationImpactReport): Promise<void> {
  const cfg = await prisma.simulationConfig.findUnique({
    where: { id: SIMULATION_CONFIG_ID },
    select: { automatedUpdatesEnabled: true },
  });
  if (cfg?.automatedUpdatesEnabled !== true) {
    if (process.env.NODE_ENV === "development") {
      console.info("[remediation-broadcast] GLOBAL_NOTIFICATIONS is muted; skipping POST.");
    }
    return;
  }

  const endpoints = await prisma.notificationEndpoint.findMany({
    where: { isEnabled: true },
    select: { id: true, name: true, urlEncrypted: true, channelType: true },
  });
  const text = buildRemediationStakeholderBrief(report);
  if (endpoints.length === 0) {
    if (process.env.NODE_ENV === "development") {
      console.info("[remediation-broadcast] No enabled notification endpoints.");
    }
    return;
  }

  for (const ep of endpoints) {
    let url: string;
    try {
      url = decryptNotificationUrl(ep.urlEncrypted);
      assertWebhookUrlPassesIrongate(url);
    } catch (e) {
      console.warn("[remediation-broadcast] Irongate skip", ep.name, ep.id, e);
      continue;
    }
    const body = jsonBodyForChannel(ep.channelType, text);
    try {
      if (cfg.automatedUpdatesEnabled === true) {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          console.warn("[remediation-broadcast]", ep.name, res.status, t);
        }
      }
    } catch (e) {
      console.warn("[remediation-broadcast] fetch error", ep.name, e);
    }
  }
}
