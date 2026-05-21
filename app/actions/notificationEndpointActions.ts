"use server";

import { revalidatePath } from "next/cache";
import { NotificationChannelType } from "@prisma/client";
import prisma from "@/lib/prisma";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import { resolveIntegrityLedgerAuthorizedLabel } from "@/app/utils/serverAuth";
import { encryptNotificationUrl, decryptNotificationUrl } from "@/lib/security/notificationEndpointCrypto";
import { assertWebhookUrlPassesIrongate } from "@/lib/security/irongateOutboundWebhook";

function maskWebhookUrl(plaintext: string): string {
  try {
    const u = new URL(plaintext);
    const path = u.pathname;
    const short = path.length <= 14 ? path : `…${path.slice(-14)}`;
    return `${u.host}${short}`;
  } catch {
    return "••••";
  }
}

async function auditNotificationConfigLedger(action: string, justification: string): Promise<void> {
  try {
    const { userId } = await resolveIntegrityLedgerAuthorizedLabel();
    await auditLogCreateLoose({
      data: {
        action,
        justification,
        operatorId: userId,
        threatId: null,
        isSimulation: true,
      },
    });
  } catch (e) {
    console.error("[notificationEndpointActions] audit append failed", e);
  }
}

export async function getEnabledNotificationEndpointCount(): Promise<number> {
  return prisma.notificationEndpoint.count({ where: { isEnabled: true } });
}

export type NotificationEndpointListRow = {
  id: string;
  name: string;
  channelType: NotificationChannelType;
  isEnabled: boolean;
  urlMasked: string;
  lastProbeAt: string | null;
  lastProbeOk: boolean | null;
  lastProbeDetail: string | null;
};

export async function listNotificationEndpoints(): Promise<NotificationEndpointListRow[]> {
  const rows = await prisma.notificationEndpoint.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      channelType: true,
      isEnabled: true,
      urlEncrypted: true,
      lastProbeAt: true,
      lastProbeOk: true,
      lastProbeDetail: true,
    },
  });
  return rows.map((r) => {
    let urlMasked = "••••";
    try {
      const plain = decryptNotificationUrl(r.urlEncrypted);
      assertWebhookUrlPassesIrongate(plain);
      urlMasked = maskWebhookUrl(plain);
    } catch {
      urlMasked = "(undecryptable or policy drift)";
    }
    return {
      id: r.id,
      name: r.name,
      channelType: r.channelType,
      isEnabled: r.isEnabled,
      urlMasked,
      lastProbeAt: r.lastProbeAt?.toISOString() ?? null,
      lastProbeOk: r.lastProbeOk,
      lastProbeDetail: r.lastProbeDetail,
    };
  });
}

/**
 * Sends a TEST PING to the decrypted endpoint URL (Irongate-validated). Updates probe fields only;
 * does **not** change `isEnabled` on failure.
 */
export async function testWebhookConnection(
  endpointId: string,
): Promise<{ ok: true } | { ok: false; error: string; httpStatus?: number }> {
  try {
    const row = await prisma.notificationEndpoint.findUnique({
      where: { id: endpointId },
      select: { id: true, urlEncrypted: true },
    });
    if (!row) return { ok: false, error: "Endpoint not found." };

    let url: string;
    try {
      url = decryptNotificationUrl(row.urlEncrypted);
      assertWebhookUrlPassesIrongate(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid URL";
      await prisma.notificationEndpoint.update({
        where: { id: endpointId },
        data: {
          lastProbeAt: new Date(),
          lastProbeOk: false,
          lastProbeDetail: msg.slice(0, 500),
        },
      });
      revalidatePath("/integrity");
      return { ok: false, error: msg };
    }

    const { displayName } = await resolveIntegrityLedgerAuthorizedLabel();
    const operator = displayName.trim() || "Operator";
    const text = `🛡️ Ironframe Connectivity Test: SUCCESS. Endpoint verified by [${operator}].`;
    const body = JSON.stringify({ text });

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (!res.ok) {
      const snippet = (await res.text().catch(() => "")).slice(0, 200);
      const detail = `HTTP ${res.status}${snippet ? `: ${snippet}` : ""}`.slice(0, 500);
      await prisma.notificationEndpoint.update({
        where: { id: endpointId },
        data: {
          lastProbeAt: new Date(),
          lastProbeOk: false,
          lastProbeDetail: detail,
        },
      });
      revalidatePath("/integrity");
      return { ok: false, error: detail || `HTTP ${res.status}`, httpStatus: res.status };
    }

    await prisma.notificationEndpoint.update({
      where: { id: endpointId },
      data: {
        lastProbeAt: new Date(),
        lastProbeOk: true,
        lastProbeDetail: `HTTP ${res.status}`,
      },
    });
    revalidatePath("/integrity");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Connection test failed";
    try {
      await prisma.notificationEndpoint.update({
        where: { id: endpointId },
        data: {
          lastProbeAt: new Date(),
          lastProbeOk: false,
          lastProbeDetail: msg.slice(0, 500),
        },
      });
      revalidatePath("/integrity");
    } catch {
      /* ignore */
    }
    return { ok: false, error: msg };
  }
}

export async function createNotificationEndpoint(input: {
  name: string;
  url: string;
  channelType: NotificationChannelType;
  isEnabled?: boolean;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const name = input.name.trim();
    if (!name) return { ok: false, error: "Name is required." };
    const url = input.url.trim();
    assertWebhookUrlPassesIrongate(url);
    const enc = encryptNotificationUrl(url);
    const row = await prisma.notificationEndpoint.create({
      data: {
        name,
        urlEncrypted: enc,
        channelType: input.channelType,
        isEnabled: input.isEnabled ?? true,
      },
    });
    const masked = maskWebhookUrl(url);
    await auditNotificationConfigLedger(
      "WEBHOOK_MODIFIED",
      `Created stakeholder endpoint "${name}" (${input.channelType}) → ${masked}`,
    );
    revalidatePath("/integrity");
    return { ok: true, id: row.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create failed";
    console.error("[createNotificationEndpoint]", e);
    return { ok: false, error: msg };
  }
}

export async function deleteNotificationEndpoint(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const row = await prisma.notificationEndpoint.findUnique({ where: { id }, select: { name: true } });
    if (!row) return { ok: false, error: "Endpoint not found." };
    await prisma.notificationEndpoint.delete({ where: { id } });
    await auditNotificationConfigLedger(
      "WEBHOOK_MODIFIED",
      `Removed stakeholder endpoint "${row.name}" (id ${id}).`,
    );
    revalidatePath("/integrity");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    return { ok: false, error: msg };
  }
}

export async function setNotificationEndpointEnabled(
  id: string,
  isEnabled: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const row = await prisma.notificationEndpoint.update({
      where: { id },
      data: { isEnabled },
      select: { name: true },
    });
    await auditNotificationConfigLedger(
      "WEBHOOK_MODIFIED",
      `Set endpoint "${row.name}" isEnabled=${isEnabled}.`,
    );
    revalidatePath("/integrity");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return { ok: false, error: msg };
  }
}
