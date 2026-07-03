import type { Request, Response } from 'express';

import { emailConfig, getResendClient } from '../../services/email/emailConfig.js';
import { bridgeEmailToCrmPipeline } from '../../services/email/emailCrmBridge.js';
import { hydrateEmailContent, parseIncomingWebhookMetadata } from '../../services/email/emailParser.js';
import { asResendIngressClient } from '../../services/email/resendSdkExtensions.js';

/** POST /api/ingress/email — Resend inbound webhook (raw body required for Svix verify). */
export async function handleResendWebhookIngress(req: Request, res: Response): Promise<void> {
  if (!emailConfig.enabled) {
    res.status(503).json({ error: 'Messaging collection channel is currently unallocated.' });
    return;
  }

  if (!(req.body instanceof Buffer)) {
    console.error('[Email Ingress] Payload was not an unparsed Buffer.');
    res.status(400).json({ error: 'Invalid ingress body format. Expects raw application/json.' });
    return;
  }

  if (!emailConfig.webhookSecret) {
    console.warn('[Email Ingress] RESEND_WEBHOOK_SECRET is unassigned while email ingress is enabled.');
    res.status(500).json({ error: 'Ingress security infrastructure unconfigured.' });
    return;
  }

  const rawBodyString = req.body.toString('utf-8');
  const svixId = req.headers['svix-id'] as string;
  const svixTimestamp = req.headers['svix-timestamp'] as string;
  const svixSignature = req.headers['svix-signature'] as string;

  try {
    const resend = asResendIngressClient(getResendClient());

    const parsedPayload = resend.webhooks.verify({
      payload: rawBodyString,
      headers: {
        id: svixId,
        timestamp: svixTimestamp,
        signature: svixSignature,
      },
      webhookSecret: emailConfig.webhookSecret,
    });

    if (parsedPayload.type === 'email.received') {
      const metadata = parseIncomingWebhookMetadata(parsedPayload);
      hydrateEmailContent(metadata)
        .then(fullMessage => bridgeEmailToCrmPipeline(fullMessage))
        .catch(err => console.error('[Email Ingress] Async processing failed:', err));
    }

    res.status(200).json({ status: 'VERIFIED_RECEIVED' });
  } catch (verifyError: unknown) {
    console.error('[Email Ingress] Webhook verification failed:', verifyError);
    res.status(401).json({ error: 'Unauthorized transport verification mismatch.' });
  }
}
