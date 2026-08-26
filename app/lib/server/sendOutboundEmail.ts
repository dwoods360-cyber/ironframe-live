import "server-only";

import { Resend } from "resend";

import { resolveSalesFromDisplay } from "@/lib/gtm/salesFromAddress";

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

/** HITL DISPATCH / sales outreach From — ironframegrc.com only (Zoho), never Gmail. */
function resolveFromAddress(): string {
  return resolveSalesFromDisplay();
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
