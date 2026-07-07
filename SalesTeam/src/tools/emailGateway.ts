import type { OutreachChannel } from '../loadSalesTeamEnv.js';

export type EmailDispatchRequest = {
  to: string;
  subject: string;
  body: string;
  from?: string;
};

export type EmailDispatchResult = {
  ok: boolean;
  queued: boolean;
  message: string;
  providerRef?: string;
};

/**
 * Email gateway — drafts only queue via ingress; live send requires operator approval + RESEND_API_KEY.
 */
export async function dispatchEmail(request: EmailDispatchRequest): Promise<EmailDispatchResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: true,
      queued: true,
      message: 'RESEND_API_KEY missing — draft held for human review only',
    };
  }

  // Operator-approved sends only — SalesTeam never auto-dispatches on poll cycle.
  return {
    ok: true,
    queued: true,
    message: 'Email dispatch gated — awaiting operator approval in dashboard',
  };
}

export function buildSmsBody(emailBody: string, channel: OutreachChannel): string {
  if (channel !== 'SMS') return emailBody;
  const condensed = emailBody.replace(/\s+/g, ' ').trim();
  return condensed.length > 320 ? `${condensed.slice(0, 317)}...` : condensed;
}
