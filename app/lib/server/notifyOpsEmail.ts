import "server-only";

/**
 * Fire-and-forget style ops notify (email + optional webhook endpoints).
 * Reuses OPS_SCHEDULE_NOTIFY_EMAIL / RESEND_API_KEY / NotificationEndpoint.
 */
export async function notifyOpsChannels(input: {
  subject: string;
  text: string;
}): Promise<{ endpointsAttempted: number; endpointsOk: number; emailOk: boolean | null }> {
  const { decryptNotificationUrl } = await import("@/lib/security/notificationEndpointCrypto");
  const { assertWebhookUrlPassesIrongate } = await import(
    "@/lib/security/irongateOutboundWebhook"
  );
  const prisma = (await import("@/lib/prisma")).default;

  const endpoints = await prisma.notificationEndpoint.findMany({
    where: { isEnabled: true },
    select: { id: true, name: true, urlEncrypted: true, channelType: true },
  });

  let endpointsOk = 0;
  for (const ep of endpoints) {
    try {
      const url = decryptNotificationUrl(ep.urlEncrypted);
      assertWebhookUrlPassesIrongate(url);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `${input.subject}\n\n${input.text}` }),
      });
      if (res.ok) endpointsOk += 1;
      else {
        const body = await res.text().catch(() => "");
        console.warn("[ops-notify] endpoint failed", ep.name, res.status, body);
      }
    } catch (err) {
      console.warn("[ops-notify] endpoint skip", ep.name, err);
    }
  }

  let emailOk: boolean | null = null;
  const notifyEmail = process.env.OPS_SCHEDULE_NOTIFY_EMAIL?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (notifyEmail && resendKey) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(resendKey);
      const from =
        process.env.IRONCAST_FROM_EMAIL?.trim() ||
        process.env.WORKSPACE_INVITE_FROM_EMAIL?.trim() ||
        "delivery@ironframegrc.com";
      const response = await resend.emails.send({
        from: `Ironframe Ops <${from}>`,
        to: [notifyEmail],
        subject: input.subject,
        text: input.text,
      });
      emailOk = !response.error;
      if (response.error) {
        console.warn("[ops-notify] email failed", response.error.message);
      }
    } catch (err) {
      emailOk = false;
      console.warn("[ops-notify] email error", err);
    }
  }

  return {
    endpointsAttempted: endpoints.length,
    endpointsOk,
    emailOk,
  };
}
