export type EmailChannelMode = 'INBOUND' | 'OUTBOUND';

export interface InboundEmailMetadata {
  emailId: string;
  messageId: string;
  from: string;
  to: string[];
  subject: string;
  createdAt: string;
}

export interface NormalizedEmailMessage {
  emailId: string;
  messageId: string;
  from: string;
  to: string[];
  subject: string;
  textBody: string;
  htmlBody?: string;
  channel: EmailChannelMode;
  timestamp: Date;
}

export interface OutboundEmailPayload {
  to: string[];
  subject: string;
  text: string;
  html?: string;
  tenantId: string;
  contactId: string;
}

export interface EmailThreadRef {
  messageId: string;
  inReplyTo?: string;
  resendEmailId: string;
}
