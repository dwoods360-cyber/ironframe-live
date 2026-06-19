import type { InboundEmailMetadata, NormalizedEmailMessage } from '../../types/email.js';
import { getResendClient } from './emailConfig.js';

/** Handles `Name <addr@domain.com>` and bare `addr@domain.com`. */
export function parseEmailAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return match ? match[1].trim().toLowerCase() : raw.trim().toLowerCase();
}

type ResendWebhookPayload = {
  type?: string;
  data?: {
    email_id?: string;
    message_id?: string;
    from?: string;
    to?: string[];
    subject?: string;
    created_at?: string;
  };
};

export function parseIncomingWebhookMetadata(payload: ResendWebhookPayload): InboundEmailMetadata {
  const { data, type } = payload;
  if (type !== 'email.received' || !data) {
    throw new Error("Invalid payload schema: event type must be 'email.received'");
  }

  const emailId = String(data.email_id ?? '').trim();
  const messageId = String(data.message_id ?? '').trim();
  if (!emailId || !messageId) {
    throw new Error('Invalid payload schema: email_id and message_id are required');
  }

  return {
    emailId,
    messageId,
    from: String(data.from ?? ''),
    to: data.to ?? [],
    subject: data.subject || '(No Subject)',
    createdAt: String(data.created_at ?? new Date().toISOString()),
  };
}

/** Hydrate body via Resend receiving API — webhooks ship metadata only. */
export async function hydrateEmailContent(meta: InboundEmailMetadata): Promise<NormalizedEmailMessage> {
  const resend = getResendClient();
  const emailDetails = await resend.emails.receiving.get(meta.emailId);

  if (emailDetails.error || !emailDetails.data) {
    throw new Error(`Failed to retrieve email content from Resend for ID: ${meta.emailId}`);
  }

  return {
    emailId: meta.emailId,
    messageId: meta.messageId,
    from: meta.from,
    to: meta.to,
    subject: meta.subject,
    textBody: emailDetails.data.text || '',
    htmlBody: emailDetails.data.html || undefined,
    channel: 'INBOUND',
    timestamp: new Date(meta.createdAt),
  };
}
