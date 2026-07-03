import { Resend } from 'resend';

import { loadIronboardEnv } from '../../loadIronboardEnv.js';

loadIronboardEnv();

export interface EmailConfigContainer {
  enabled: boolean;
  apiKey?: string;
  fromAddress: string;
  webhookSecret?: string;
}

export const emailConfig: EmailConfigContainer = {
  enabled: process.env.IRONBOARD_EMAIL_ENABLED === '1',
  apiKey: process.env.RESEND_API_KEY,
  fromAddress: process.env.IRONBOARD_EMAIL_FROM || 'dispatch@ironboard.com',
  webhookSecret: process.env.RESEND_WEBHOOK_SECRET || process.env.IRONBOARD_EMAIL_WEBHOOK_SECRET,
};

let cachedClient: Resend | null = null;

/** Lazy Resend client — missing keys must not crash IronBoard on boot. */
export function getResendClient(): Resend {
  if (!emailConfig.enabled) {
    throw new Error('Messaging system is offline. Enable via IRONBOARD_EMAIL_ENABLED=1.');
  }
  if (!emailConfig.apiKey) {
    throw new Error('RESEND_API_KEY is not assigned in this runtime zone.');
  }

  if (!cachedClient) {
    cachedClient = new Resend(emailConfig.apiKey);
  }
  return cachedClient;
}
