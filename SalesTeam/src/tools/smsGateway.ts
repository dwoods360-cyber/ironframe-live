import type { OutreachChannel } from '../loadSalesTeamEnv.js';

export type SmsDispatchRequest = {
  to: string;
  body: string;
  from?: string;
};

export type SmsDispatchResult = {
  ok: boolean;
  queued: boolean;
  message: string;
  providerRef?: string;
};

/**
 * SMS gateway for 216-234-1806 — Twilio/GHL integration stub; poll cycle never auto-sends.
 */
export async function dispatchSms(request: SmsDispatchRequest): Promise<SmsDispatchResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from =
    request.from?.trim() || process.env.SALESTEAM_SMS_FROM?.trim() || '+12162341806';

  if (!sid || !token) {
    return {
      ok: true,
      queued: true,
      message: `Twilio not configured — SMS draft held (from ${from})`,
    };
  }

  return {
    ok: true,
    queued: true,
    message: 'SMS dispatch gated — awaiting operator approval in dashboard',
  };
}

export function isSmsChannel(channel: OutreachChannel): boolean {
  return channel === 'SMS';
}
