import "server-only";

import { Resend } from "resend";

const DEFAULT_FROM_EMAIL = "delivery@ironframegrc.com";
const DEFAULT_FROM_NAME = "Ironframe Delivery";

export type OutboundEmailPayload = {
  to: string[];
  subject: string;
  text: string;
  html?: string;
  tenantId: string;
  contactId: string;
};

export type SendOutboundEmailResult = {
  success: boolean;
  emailId?: string;
  error?: string;
};

function resolveFromAddress(): string {
  const name =
    process.env.WORKSPACE_INVITE_FROM_NAME?.trim() ||
    process.env.IRONCAST_FROM_NAME?.trim() ||
    DEFAULT_FROM_NAME;
  const email =
    process.env.WORKSPACE_INVITE_FROM_EMAIL?.trim() ||
    process.env.IRONCAST_FROM_EMAIL?.trim() ||
    DEFAULT_FROM_EMAIL;
  return `${name} <${email}>`;
}

export async function sendOutboundEmail(
  payload: OutboundEmailPayload,
): Promise<SendOutboundEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { success: false, error: "RESEND_API_KEY is not configured." };
  }

  try {
    const resend = new Resend(apiKey);
    const response = await resend.emails.send({
      from: resolveFromAddress(),
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      tags: [
        { name: "tenant_id", value: payload.tenantId },
        { name: "contact_id", value: payload.contactId },
      ],
    });

    if (response.error) {
      return { success: false, error: response.error.message };
    }

    return { success: true, emailId: response.data?.id };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unhandled delivery failure.";
    return { success: false, error: message };
  }
}
