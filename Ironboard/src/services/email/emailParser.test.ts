import { describe, expect, it } from 'vitest';

import { parseEmailAddress, parseIncomingWebhookMetadata } from './emailParser.js';

describe('parseEmailAddress', () => {
  it('extracts address from display-name format', () => {
    expect(parseEmailAddress('Operator Name <operator@domain.internal>')).toBe(
      'operator@domain.internal',
    );
  });

  it('normalizes bare addresses', () => {
    expect(parseEmailAddress('  User@Example.COM  ')).toBe('user@example.com');
  });
});

describe('parseIncomingWebhookMetadata', () => {
  it('maps email.received payload fields', () => {
    const meta = parseIncomingWebhookMetadata({
      type: 'email.received',
      data: {
        email_id: 'email-1',
        message_id: 'msg-1',
        from: 'a@b.com',
        to: ['inbox@c.com'],
        subject: 'Hello',
        created_at: '2026-06-17T12:00:00.000Z',
      },
    });

    expect(meta.emailId).toBe('email-1');
    expect(meta.messageId).toBe('msg-1');
    expect(meta.to).toEqual(['inbox@c.com']);
  });

  it('rejects non-receiving events', () => {
    expect(() => parseIncomingWebhookMetadata({ type: 'email.sent', data: {} })).toThrow(
      'email.received',
    );
  });
});
