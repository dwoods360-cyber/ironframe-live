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
 * SalesTeam poll cycle never auto-sends. Live Twilio send happens only after
 * operator DISPATCH on Ironframe approvals (`sendOutboundSms`).
 *
 * Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and SALESTEAM_SMS_FROM
 * (Twilio E.164 number — not Google Voice).
 */
export async function dispatchSms(request: SmsDispatchRequest): Promise<SmsDispatchResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from =
    request.from?.trim() || process.env.SALESTEAM_SMS_FROM?.trim() || process.env.TWILIO_SMS_FROM_NUMBER?.trim() || '';

  if (!sid || !token || !from) {
    return {
      ok: true,
      queued: true,
      message: `Twilio not configured — SMS draft held for approval (to ${request.to})`,
    };
  }

  return {
    ok: true,
    queued: true,
    message: `SMS draft gated — awaiting operator DISPATCH (from ${from} → ${request.to})`,
  };
}

export function isSmsChannel(channel: OutreachChannel): boolean {
  return channel === 'SMS';
}
