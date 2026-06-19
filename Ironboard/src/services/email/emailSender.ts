import type { OutboundEmailPayload } from '../../types/email.js';
import { emailConfig, getResendClient } from './emailConfig.js';

export interface SendResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

export async function sendOutboundEmail(payload: OutboundEmailPayload): Promise<SendResult> {
  try {
    const resend = getResendClient();
    const response = await resend.emails.send({
      from: emailConfig.fromAddress,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      tags: [
        { name: 'tenant_id', value: payload.tenantId },
        { name: 'contact_id', value: payload.contactId },
      ],
    });

    if (response.error) {
      return { success: false, error: response.error.message };
    }

    return { success: true, emailId: response.data?.id };
  } catch (ex: unknown) {
    const message = ex instanceof Error ? ex.message : 'Unhandled delivery failure.';
    return { success: false, error: message };
  }
}
