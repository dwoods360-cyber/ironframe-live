import "server-only";

import { normalizeE164Phone } from "@/app/lib/phoneE164";

export type OutboundSmsPayload = {
  to: string;
  body: string;
  tenantId: string;
  contactId: string;
  from?: string;
};

export type SendOutboundSmsResult = {
  success: boolean;
  /** Twilio Message SID or Textbelt textId */
  messageSid?: string;
  provider?: "twilio" | "textbelt";
  error?: string;
};

export { normalizeE164Phone };

export type SmsProviderId = "twilio" | "textbelt";

export function resolveSmsProvider(): SmsProviderId {
  const explicit = process.env.SMS_PROVIDER?.trim().toLowerCase();
  if (explicit === "textbelt" || explicit === "twilio") return explicit;
  if (process.env.TEXTBELT_API_KEY?.trim()) return "textbelt";
  return "twilio";
}

export function resolveTwilioSmsFromNumber(override?: string): string | null {
  const from =
    override?.trim() ||
    process.env.TWILIO_SMS_FROM_NUMBER?.trim() ||
    process.env.SALESTEAM_SMS_FROM?.trim() ||
    "";
  return normalizeE164Phone(from);
}

async function sendViaTextbelt(
  payload: OutboundSmsPayload,
  to: string,
  body: string,
): Promise<SendOutboundSmsResult> {
  const key = process.env.TEXTBELT_API_KEY?.trim();
  if (!key) {
    return {
      success: false,
      provider: "textbelt",
      error: "TEXTBELT_API_KEY is not configured (create a key at https://textbelt.com/).",
    };
  }

  const sender =
    process.env.TEXTBELT_SENDER?.trim() ||
    process.env.IRONCAST_FROM_NAME?.trim() ||
    "Ironframe GRC";

  try {
    const form = new URLSearchParams({
      phone: to,
      message: body,
      key,
      sender,
    });
    // Trace ids for operator audit — truncated, not secrets.
    form.set(
      "webhookData",
      `${payload.tenantId.slice(0, 8)}:${payload.contactId.slice(0, 8)}`.slice(0, 100),
    );

    const res = await fetch("https://textbelt.com/text", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: AbortSignal.timeout(20_000),
    });
    const raw = await res.text();
    let parsed: {
      success?: boolean;
      textId?: string | number;
      error?: string;
      quotaRemaining?: number;
    } = {};
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      /* non-JSON */
    }

    if (!res.ok || !parsed.success) {
      return {
        success: false,
        provider: "textbelt",
        error:
          parsed.error ||
          `Textbelt rejected SMS (${res.status}): ${raw.slice(0, 300)}`,
      };
    }

    return {
      success: true,
      provider: "textbelt",
      messageSid: parsed.textId != null ? String(parsed.textId) : undefined,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unhandled Textbelt failure.";
    return { success: false, provider: "textbelt", error: message };
  }
}

async function sendViaTwilio(
  payload: OutboundSmsPayload,
  to: string,
  body: string,
): Promise<SendOutboundSmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = resolveTwilioSmsFromNumber(payload.from);

  if (!sid || !token) {
    return {
      success: false,
      provider: "twilio",
      error: "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN are not configured.",
    };
  }
  if (!from) {
    return {
      success: false,
      provider: "twilio",
      error:
        "TWILIO_SMS_FROM_NUMBER (or SALESTEAM_SMS_FROM) must be a Twilio E.164 number — Google Voice cannot be used.",
    };
  }

  try {
    const form = new URLSearchParams({
      To: to,
      From: from,
      Body: body,
    });

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
      signal: AbortSignal.timeout(20_000),
    });

    const raw = await res.text();
    let parsed: { sid?: string; message?: string; error_message?: string } = {};
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      /* non-JSON */
    }

    if (!res.ok) {
      return {
        success: false,
        provider: "twilio",
        error:
          parsed.message ||
          parsed.error_message ||
          `Twilio Messages API rejected SMS (${res.status}): ${raw.slice(0, 300)}`,
      };
    }

    return { success: true, provider: "twilio", messageSid: parsed.sid };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unhandled SMS delivery failure.";
    return { success: false, provider: "twilio", error: message };
  }
}

/**
 * Operator-approved DISPATCH only.
 * Providers: `SMS_PROVIDER=textbelt` (no Twilio number / ID selfie) or `twilio`.
 */
export async function sendOutboundSms(
  payload: OutboundSmsPayload,
): Promise<SendOutboundSmsResult> {
  const to = normalizeE164Phone(payload.to);
  if (!to) {
    return { success: false, error: "Contact phone must be a valid E.164 number." };
  }

  const body = payload.body.trim().slice(0, 1600);
  if (!body) {
    return { success: false, error: "Cannot send an empty SMS payload." };
  }

  // Compliance: include org name + STOP for commercial A2P-style outreach.
  const branded =
    /\bSTOP\b/i.test(body) && /Ironframe/i.test(body)
      ? body
      : `Ironframe GRC: ${body}${/\bSTOP\b/i.test(body) ? "" : " Reply STOP to opt out."}`.slice(
          0,
          1600,
        );

  const provider = resolveSmsProvider();
  if (provider === "textbelt") {
    return sendViaTextbelt(payload, to, branded);
  }
  return sendViaTwilio(payload, to, branded);
}
